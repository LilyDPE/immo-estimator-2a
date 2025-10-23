import { DVFSale } from '@/types';

const DVF_API_BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv';

// Fonction pour extraire le département du code postal
function getDepartmentFromPostalCode(postalCode: string): string {
  // Les codes postaux français commencent par 2 ou 3 chiffres (département)
  if (postalCode.startsWith('97') || postalCode.startsWith('98')) {
    // DOM-TOM : 3 chiffres
    return postalCode.substring(0, 3);
  }
  // Métropole : 2 chiffres
  return postalCode.substring(0, 2);
}

// Cache pour stocker les données DVF par département
const dvfCache: { [key: string]: any[] } = {};

async function loadDVFDataForDepartment(postalCode: string): Promise<any[]> {
  const department = getDepartmentFromPostalCode(postalCode);
  
  // Vérifier si les données sont déjà en cache
  if (dvfCache[department]) {
    console.log(`📦 Données DVF du département ${department} déjà en cache`);
    return dvfCache[department];
  }

  console.log(`⬇️ Téléchargement des données DVF pour le département ${department}...`);
  
  const url = `${DVF_API_BASE}/${department}.csv`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status} pour ${url}`);
      return [];
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    if (lines.length < 2) {
      console.error(`❌ Fichier CSV vide pour le département ${department}`);
      return [];
    }

    const headers = lines[0].split(',');
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
    
    // Mettre en cache
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
  console.log(`🔍 Recherche de comparables dans un rayon de ${radiusKm}km pour le code postal ${postalCode}`);

  // Charger les données DVF du département
  const dvfData = await loadDVFDataForDepartment(postalCode);

  if (dvfData.length === 0) {
    console.log('❌ Aucune donnée DVF disponible pour ce département');
    return [];
  }

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
      // Filtrer par type de local
      if (!allowedTypes.includes(record.type_local)) return false;

      // Filtrer par surface
      const surface = parseFloat(record.surface_reelle_bati);
      if (isNaN(surface) || surface < surfaceMin || surface > surfaceMax) return false;

      // Filtrer par date (3 dernières années)
      const saleDate = new Date(record.date_mutation);
      if (saleDate < threeYearsAgo) return false;

      // Filtrer par prix (éliminer les valeurs aberrantes)
      const price = parseFloat(record.valeur_fonciere);
      if (isNaN(price) || price < 10000 || price > 10000000) return false;

      // Vérifier les coordonnées GPS
      const lat = parseFloat(record.latitude);
      const lon = parseFloat(record.longitude);
      if (isNaN(lat) || isNaN(lon)) return false;

      // Filtrer par distance
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
  totalSales: number;
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  avgPrice: number;
}> {
  console.log(`📊 Calcul des statistiques de marché pour le code postal ${postalCode}`);

  // Charger les données DVF du département
  const dvfData = await loadDVFDataForDepartment(postalCode);

  if (dvfData.length === 0) {
    return {
      totalSales: 0,
      avgPricePerSqm: 0,
      medianPricePerSqm: 0,
      avgPrice: 0
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
      totalSales: 0,
      avgPricePerSqm: 0,
      medianPricePerSqm: 0,
      avgPrice: 0
    };
  }

  const pricesPerSqm = allSales.map(s => s.pricePerSqm).sort((a, b) => a - b);
  const prices = allSales.map(s => s.price);

  return {
    totalSales: allSales.length,
    avgPricePerSqm: Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length),
    medianPricePerSqm: pricesPerSqm[Math.floor(pricesPerSqm.length / 2)],
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
  };
}
