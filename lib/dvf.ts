import NodeCache from 'node-cache';
import { DVFSale } from '@/types';

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

const DVF_API_BASE = 'https://api.cquest.org/dvf';
const DVF_API_ETALAB = 'https://app.dvf.etalab.gouv.fr/api/v2';

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
  if (cached) {
    console.log('✅ DVF data from cache');
    return cached;
  }

  console.log('🔍 Fetching DVF data from API...');

  try {
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      dist: (radiusKm * 1000).toString(),
      type_local: 'Maison,Appartement',
      surface_min: (surface * 0.7).toString(),
      surface_max: (surface * 1.3).toString(),
    });

    let response;
    try {
      const url = `${DVF_API_BASE}?${params.toString()}`;
      response = await fetch(url, {
        headers: { 'User-Agent': 'ImmoEstimator/1.0' }
      });

      if (!response.ok) {
        throw new Error(`DVF API error: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Primary API failed, trying fallback...');
      response = await fetch(`${DVF_API_ETALAB}/sales?${params.toString()}`);
    }

    const data = await response.json();
    
    const sales: DVFSale[] = (data.results || data.features || [])
      .filter((sale: any) => {
        return (
          sale.valeur_fonciere > 0 &&
          sale.surface_reelle_bati > 0 &&
          sale.latitude &&
          sale.longitude
        );
      })
      .map((sale: any) => {
        const lat = parseFloat(sale.latitude);
        const lon = parseFloat(sale.longitude);
        const distance = calculateDistance(latitude, longitude, lat, lon);
        const pricePerSqm = sale.valeur_fonciere / sale.surface_reelle_bati;

        return {
          id: sale.id_mutation,
          date: sale.date_mutation,
          price: sale.valeur_fonciere,
          surface: sale.surface_reelle_bati,
          rooms: sale.nombre_pieces_principales || 0,
          type: sale.type_local,
          address: `${sale.adresse_numero || ''} ${sale.adresse_nom_voie || ''}, ${sale.nom_commune}`.trim(),
          latitude: lat,
          longitude: lon,
          distance,
          pricePerSqm,
        };
      })
      .sort((a: DVFSale, b: DVFSale) => a.distance! - b.distance!)
      .slice(0, maxResults);

    const filteredSales = removeOutliers(sales);

    cache.set(cacheKey, filteredSales);
    
    console.log(`✅ Found ${filteredSales.length} comparable sales`);
    return filteredSales;

  } catch (error) {
    console.error('❌ Error fetching DVF data:', error);
    throw new Error('Impossible de récupérer les données DVF. Réessayez plus tard.');
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function removeOutliers(sales: DVFSale[]): DVFSale[] {
  if (sales.length < 3) return sales;

  const pricesPerSqm = sales.map(s => s.pricePerSqm).sort((a, b) => a - b);
  const median = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];
  
  const threshold = median * 0.3;

  return sales.filter(sale => {
    const diff = Math.abs(sale.pricePerSqm - median);
    return diff <= threshold;
  });
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
    return {
      averagePrice: 0,
      medianPrice: 0,
      numberOfSales: 0,
      period: '3 dernières années'
    };
  }

  const prices = sales.map(s => s.price).sort((a, b) => a - b);
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];

  return {
    averagePrice,
    medianPrice,
    numberOfSales: sales.length,
    period: '3 dernières années'
  };
}
