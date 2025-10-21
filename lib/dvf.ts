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
  if (cached) {
    return cached;
  }

  try {
    const url = `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}`;
    const geoResponse = await fetch(url);
    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      return [];
    }

    const codeCommune = geoData[0].code;
    const dvfUrl = `https://api.cquest.org/dvf?code_commune=${codeCommune}`;
    
    const response = await fetch(dvfUrl);
    const data = await response.json();

    if (!data.resultats) {
      return [];
    }

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const sales: DVFSale[] = data.resultats
      .filter((s: any) => s.valeur_fonciere > 0 && s.surface_reelle_bati > 0 && new Date(s.date_mutation) >= threeYearsAgo)
      .map((s: any) => ({
        id: s.id_mutation || `${s.date_mutation}_${s.valeur_fonciere}`,
        date: s.date_mutation,
        price: s.valeur_fonciere,
        surface: s.surface_reelle_bati,
        rooms: s.nombre_pieces_principales || rooms,
        type: s.type_local,
        address: `${s.nom_commune}`,
        latitude: parseFloat(s.latitude),
        longitude: parseFloat(s.longitude),
        distance: 0,
        pricePerSqm: s.valeur_fonciere / s.surface_reelle_bati,
      }))
      .slice(0, maxResults);

    cache.set(cacheKey, sales);
    return sales;

  } catch (error) {
    console.error('DVF error:', error);
    return [];
  }
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
