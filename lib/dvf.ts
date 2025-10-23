import { DVFSale } from '@/types';
import pako from 'pako';

// URL CORRIGÉE avec l'année 2024 et le dossier departements
const DVF_API_BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements';

// Fonction pour extraire le département du code postal
function getDepartmentFromPostalCode(postalCode: string): string {
  if (postalCode.startsWith('97') || postalCode.startsWith('98')) {
    return postalCode.substring(0, 3);
  }
  return postalCode.substring(0, 2);
}

// Cache pour stocker les données DVF par département
const dvfCache: { [key: string]: any[] } = {};

async function loadDVFDataForDepartment(postalCode: string): Promise<any[]> {
  const department = getDepartmentFromPostalCode(postalCode);
  
  console.log(`🔍 Code postal: ${postalCode} → Département: ${department}`);
  
  if (dvfCache[department]) {
    console.log(`📦 Données DVF du département ${department} déjà en cache (${dvfCache[department].length} records)`);
    return dvfCache[department];
  }

  // URL CORRIGÉE avec .csv.gz
  const url = `${DVF_API_BASE}/${department}.csv.gz`;
  console.log(`⬇️ Téléchargement: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status} pour ${url}`);
      return [];
    }

    // Décompresser le fichier GZIP
    const arrayBuffer = await response.arrayBuffer();
    console.log(`📦 Fichier téléchargé: ${arrayBuffer.byteLength} bytes (compressé)`);
    
    const decompressed = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' });
    console.log(`📄 Fichier décompressé: ${decompressed.length} caractères`);
    
    const lines = decompressed.split('\n');
    console.log(`📝 Nombre de lignes: ${lines.length}`);
    
    if (lines.length < 2) {
      console.error(`❌ Fichier CSV vide pour le département ${department}`);
      return [];
    }

    const headers = lines[0].split(',');
    console.log(`📋 Headers (premiers 10):`, headers.slice(0, 10));
    
    const data = lines.slice(1)
      .filter(line => line.trim().length > 0)
      .map(line => {
        const values = line.split(',');
        const record: any = {};
        headers.forEach((header, index) => {
          record[header.trim()] = values[index] ? values[index].trim() : '';
        });
        return record;
      });

    console.log(`✅ ${data.length} transactions chargées pour le département ${department}`);
    
    if (data.length > 0) {
      console.log(`🔍 Premier enregistrement:`, data[0]);
    }
    
    dvfCache[department] = data;
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors du chargement des données DVF pour ${department}:`, error);
    return [];
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function searchComparableSales(
  latitude: number,
  longitude: number,
  radiusKm: number,
  propertyType: 'apartment' | 'house',
  targetSurface: number,
  postalCode: string
): Promise<DVFSale[]> {
  console.log(`🔍 Recherche de comparables:`);
  console.log(`   - Rayon: ${radiusKm}km`);
  console.log(`   - Code postal: ${postalCode}`);
  console.log(`   - Type: ${propertyType}`);
  console.log(`   - Surface cible: ${targetSurface}m²`);

  const dvfData = await loadDVFDataForDepartment(postalCode);

  if (dvfData.length === 0) {
    console.log('❌ Aucune donnée DVF disponible');
    return [];
  }

  console.log(`📊 ${dvfData.length} transactions totales dans le département`);

  const typeLocalMapping = {
    apartment: ['Appartement'],
    house: ['Maison']
  };

  const allowedTypes = typeLocalMapping[propertyType] || [];
  const surfaceMin = targetSurface * 0.7;
  const surfaceMax = targetSurface * 1.3;
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const sales: DVFSale[] = dvfData
    .filter(record => {
      if (!allowedTypes.includes(record.type_local)) return false;
      
      const surface = parseFloat(record.surface_reelle_bati);
      if (isNaN(surface) || surface < surfaceMin || surface > surfaceMax) return false;
      
      const saleDate = new Date(record.date_mutation);
      if (saleDate < threeYearsAgo) return false;
      
      const price = parseFloat(record.valeur_fonciere);
      if (isNaN(price) || price < 10000 || price > 10000000) return false;
      
      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      if (isNaN(lat) || isNaN(lon)) return false;
      
      const distance = haversineDistance(latitude, longitude, lat, lon);
      if (distance > radiusKm) return false;

      return true;
    })
    .map(record => {
      const surface = parseFloat(record.surface_reelle_bati);
      const price = parseFloat(record.valeur_fonciere);
      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      const distance = haversineDistance(latitude, longitude, lat, lon);

      return {
        id: `${record.id_mutation}-${record.numero_disposition}`,
        date: record.date_mutation,
        price: price,
        surface: surface,
        pricePerSqm: Math.round(price / surface),
        type: record.type_local === 'Appartement' ? 'apartment' : 'house',
        address: `${record.adresse_numero || ''} ${record.adresse_nom_voie || ''}, ${record.code_postal} ${record.nom_commune}`.trim(),
        city: record.nom_commune,
        postalCode: record.code_postal,
        rooms: record.nombre_pieces_principales ? parseInt(record.nombre_pieces_principales) : undefined,
        latitude: lat,
        longitude: lon,
        distance: distance,
      } as DVFSale;
    })
    .sort((a, b) => a.distance! - b.distance!);

  console.log(`✅ ${sales.length} ventes comparables trouvées`);
  
  return sales;
}

export async function getMarketStatistics(
  latitude: number,
  longitude: number,
  radiusKm: number,
  postalCode: string
): Promise<{
  averagePrice: number;
  medianPrice: number;
  numberOfSales: number;
  period: string;
}> {
  console.log(`📊 Calcul des statistiques de marché pour ${postalCode}`);

  const dvfData = await loadDVFDataForDepartment(postalCode);

  if (dvfData.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      numberOfSales: 0,
      period: '3 dernières années'
    };
  }

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const allSales = dvfData
    .filter(record => {
      const saleDate = new Date(record.date_mutation);
      if (saleDate < threeYearsAgo) return false;

      const price = parseFloat(record.valeur_fonciere);
      if (isNaN(price) || price < 10000 || price > 10000000) return false;

      const surface = parseFloat(record.surface_reelle_bati);
      if (isNaN(surface) || surface < 10 || surface > 500) return false;

      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      if (isNaN(lat) || isNaN(lon)) return false;

      const distance = haversineDistance(latitude, longitude, lat, lon);
      if (distance > radiusKm) return false;

      return true;
    })
    .map(record => ({
      price: parseFloat(record.valeur_fonciere),
      surface: parseFloat(record.surface_reelle_bati),
      pricePerSqm: Math.round(parseFloat(record.valeur_fonciere) / parseFloat(record.surface_reelle_bati))
    }));

  if (allSales.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      numberOfSales: 0,
      period: '3 dernières années'
    };
  }

  const prices = allSales.map(s => s.price).sort((a, b) => a - b);

  return {
    averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    medianPrice: prices[Math.floor(prices.length / 2)],
    numberOfSales: allSales.length,
    period: '3 dernières années'
  };
}
