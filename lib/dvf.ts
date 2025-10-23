import NodeCache from 'node-cache';
import { DVFSale } from '@/types';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';

const cache = new NodeCache({ stdTTL: 86400 });

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateId(): string {
  return `dvf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Parser CSV simple (ligne par ligne)
function parseCSVLine(line: string, headers: string[]): any {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const obj: any = {};
  headers.forEach((header, index) => {
    obj[header] = values[index] || '';
  });
  return obj;
}

async function fetchDepartmentData(departement: string): Promise<string> {
  const cacheKey = `dept_${departement}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    console.log('✅ Using cached department data');
    return cached;
  }

  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/${departement}.csv.gz`;
  console.log(`📥 Downloading ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Décompresser le gzip
    const buffer = Buffer.from(await response.arrayBuffer());
    const gunzip = createGunzip();
    
    return new Promise((resolve, reject) => {
      let data = '';
      const readable = Readable.from(buffer);
      
      readable
        .pipe(gunzip)
        .on('data', (chunk) => {
          data += chunk.toString();
        })
        .on('end', () => {
          console.log(`✅ Downloaded and decompressed ${data.length} bytes`);
          cache.set(cacheKey, data);
          resolve(data);
        })
        .on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error downloading:', error);
    throw error;
  }
}

export async function searchComparableSales(
  latitude: number,
  longitude: number,
  surface: number,
  years: number = 3,
  radiusKm: number = 5,
  maxResults: number = 50,
  codePostal?: string
): Promise<DVFSale[]> {
  const cacheKey = `dvf_${latitude}_${longitude}_${surface}_${years}_${radiusKm}_${codePostal}`;
  
  const cached = cache.get<DVFSale[]>(cacheKey);
  if (cached) {
    console.log('✅ Cache hit');
    return cached;
  }

  try {
    console.log(`🔍 Searching DVF: lat=${latitude}, lon=${longitude}, radius=${radiusKm}km, postal=${codePostal}`);
    
    // Extraire le département du code postal
    const departement = codePostal ? codePostal.substring(0, 2) : '76';
    console.log(`📍 Department from postal code: ${departement}`);

    // Télécharger les données du département
    const csvData = await fetchDepartmentData(departement);

    // Parser et filtrer
    const lines = csvData.split('\n');
    if (lines.length < 2) {
      console.log('⚠️ No data in CSV');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`📊 Processing ${lines.length} lines`);

    const sales: DVFSale[] = [];
    const limitDate = new Date();
    limitDate.setFullYear(limitDate.getFullYear() - years);

    for (let i = 1; i < lines.length && sales.length < maxResults * 3; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const row = parseCSVLine(line, headers);

        // Filtres
        if (!row.latitude || !row.longitude) continue;
        if (row.type_local !== 'Maison' && row.type_local !== 'Appartement') continue;
        
        const valeur = parseFloat(row.valeur_fonciere);
        const surf = parseFloat(row.surface_reelle_bati);
        if (!valeur || valeur <= 0 || !surf || surf < 10) continue;

        const saleDate = new Date(row.date_mutation);
        if (saleDate < limitDate) continue;

        // Calculer distance
        const lat = parseFloat(row.latitude);
        const lon = parseFloat(row.longitude);
        if (isNaN(lat) || isNaN(lon)) continue;
        
        const dist = calculateDistance(latitude, longitude, lat, lon);

        if (dist <= radiusKm) {
          sales.push({
            id: generateId(),
            date: row.date_mutation,
            price: valeur,
            surface: surf,
            rooms: parseInt(row.nombre_pieces_principales) || 0,
            type: row.type_local,
            address: `${row.adresse_numero || ''} ${row.adresse_nom_voie || ''}, ${row.nom_commune || ''}`.trim(),
            latitude: lat,
            longitude: lon,
            distance: dist,
            pricePerSqm: Math.round(valeur / surf)
          });
        }
      } catch (error) {
        // Ignorer les lignes mal formatées
        continue;
      }
    }

    // Trier par distance
    sales.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    const finalSales = sales.slice(0, maxResults);

    console.log(`✅ Found ${finalSales.length} sales within ${radiusKm}km`);
    
    if (finalSales.length > 0) {
      cache.set(cacheKey, finalSales);
    }
    
    return finalSales;

  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
}

export async function getMarketStatistics(
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  codePostal?: string
): Promise<{
  averagePrice: number;
  medianPrice: number;
  numberOfSales: number;
  period: string;
}> {
  const sales = await searchComparableSales(latitude, longitude, 70, 3, radiusKm, 100, codePostal);
  
  if (sales.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      numberOfSales: 0,
      period: '3 dernières années'
    };
  }

  const prices = sales.map(s => s.pricePerSqm).sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  const med = prices[Math.floor(prices.length / 2)];

  return {
    averagePrice: avg,
    medianPrice: med,
    numberOfSales: sales.length,
    period: '3 dernières années'
  };
}
