import NodeCache from 'node-cache';
import { DVFSale } from '@/types';

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

export async function searchComparableSales(
  latitude: number,
  longitude: number,
  surface: number,
  rooms: number,
  radiusKm: number = 2,
  maxResults: number = 50
): Promise<DVFSale[]> {
  const cacheKey = `dvf_${latitude}_${longitude}_${surface}_${rooms}_${radiusKm}`;
  
  const cached = cache.get<DVFSale[]>(cacheKey);
  if (cached) return cached;

  try {
    const geoUrl = `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}&fields=code,nom`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    
    if (!geoData || geoData.length === 0) return [];

    const code = geoData[0].code;
    console.log(`📍 Code commune: ${code}`);

    const today = new Date();
    const threeYears = new Date(today.getFullYear() - 3, 0, 1);
    const dateMin = threeYears.toISOString().split('T')[0];

    const dvfUrl = `https://apidf-preprod.adiGIS.com/dvf.php?code_commune=${code}`;
    
    console.log(`🔗 Tentative DVF URL: ${dvfUrl}`);
    
    const res = await fetch(dvfUrl);
    const text = await res.text();
    
    console.log(`📦 Response type: ${typeof text}, length: ${text.length}`);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('⚠️ API 1 failed, trying fallback...');
      
      const prices = getPriceEstimateByDepartment(code.substring(0, 2));
      return [{
        id: 'fallback',
        date: new Date().toISOString(),
        price: prices.avgPrice * surface,
        surface: surface,
        rooms: rooms,
        type: 'Maison',
        address: geoData[0].nom,
        latitude: latitude,
        longitude: longitude,
        distance: 0,
        pricePerSqm: prices.avgPricePerSqm,
      }];
    }

    if (!data || !Array.isArray(data)) return [];

    const sales: DVFSale[] = data
      .filter((s: any) => s.valeur_fonciere > 0 && s.surface_reelle_bati > 0)
      .map((s: any) => ({
        id: s.id_mutation || Math.random().toString(),
        date: s.date_mutation,
        price: s.valeur_fonciere,
        surface: s.surface_reelle_bati,
        rooms: s.nombre_pieces_principales || rooms,
        type: s.type_local,
        address: s.nom_commune || geoData[0].nom,
        latitude: parseFloat(s.latitude) || latitude,
        longitude: parseFloat(s.longitude) || longitude,
        distance: 0,
        pricePerSqm: s.valeur_fonciere / s.surface_reelle_bati,
      }))
      .slice(0, maxResults);

    console.log(`✅ Found ${sales.length} sales`);
    
    cache.set(cacheKey, sales);
    return sales;

  } catch (error) {
    console.error('❌ DVF error:', error);
    return [];
  }
}

function getPriceEstimateByDepartment(dept: string): { avgPrice: number; avgPricePerSqm: number } {
  const prices: Record<string, { avgPrice: number; avgPricePerSqm: number }> = {
    '75': { avgPrice: 600000, avgPricePerSqm: 10000 },
    '76': { avgPrice: 180000, avgPricePerSqm: 1800 },
    '27': { avgPrice: 200000, avgPricePerSqm: 2000 },
    '14': { avgPrice: 220000, avgPricePerSqm: 2200 },
  };
  return prices[dept] || { avgPrice: 200000, avgPricePerSqm: 2000 };
}

export async function getMarketStatistics(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
): Promise<{
  averagePrice: number;
  medianPrice: number;
  numberOfSales: number;
  period: string;
}> {
  const sales = await searchComparableSales(latitude, longitude, 70, 3, radiusKm, 100);
  
  if (sales.length === 0) {
    return { averagePrice: 0, medianPrice: 0, numberOfSales: 0, period: '3 dernières années' };
  }

  const prices = sales.map(s => s.price).sort((a, b) => a - b);
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];

  return { averagePrice, medianPrice, numberOfSales: sales.length, period: '3 dernières années' };
}
