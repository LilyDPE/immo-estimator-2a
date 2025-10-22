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
    const nom = geoData[0].nom;
    
    console.log(`📍 Commune: ${nom} (${code})`);

    const today = new Date();
    const threeYears = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const dateMin = threeYears.toISOString().split('T')[0];

    const dvfUrl = `https://app.dvf.etalab.gouv.fr/api/v2/transactions?code_commune=${code}&date_mutation_min=${dateMin}`;
    
    console.log(`🔗 DVF URL: ${dvfUrl}`);
    
    const res = await fetch(dvfUrl);
    const data = await res.json();

    console.log(`📦 DVF Response:`, data);

    if (!data.results || data.results.length === 0) return [];

    const sales: DVFSale[] = data.results
      .filter((s: any) => 
        s.valeur_fonciere > 0 && 
        s.surface_reelle_bati > 0 &&
        (s.type_local === 'Maison' || s.type_local === 'Appartement')
      )
      .map((s: any) => ({
        id: s.id_mutation,
        date: s.date_mutation,
        price: s.valeur_fonciere,
        surface: s.surface_reelle_bati,
        rooms: s.nombre_pieces_principales || rooms,
        type: s.type_local,
        address: `${s.adresse_nom_voie || s.nom_commune}`,
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
