import { createClient } from '@supabase/supabase-js';
import { DVFSale } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function searchComparableSales(
  latitude: number,
  longitude: number,
  surface: number,
  rooms: number,
  radiusKm: number = 2,
  maxResults: number = 50
): Promise<DVFSale[]> {
  try {
    const geoUrl = `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}&fields=code,nom`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    
    if (!geoData || geoData.length === 0) return [];

    const codeCommune = geoData[0].code;
    console.log(`📍 Recherche pour ${geoData[0].nom} (${codeCommune})`);

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const dateMin = threeYearsAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ventes_dvf')
      .select('*')
      .eq('code_commune', codeCommune)
      .gte('date_mutation', dateMin)
      .in('type_local', ['Maison', 'Appartement'])
      .gt('valeur_fonciere', 0)
      .gt('surface_reelle_bati', 0)
      .order('date_mutation', { ascending: false })
      .limit(maxResults);

    if (error) {
      console.error('❌ Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No sales found');
      return [];
    }

    console.log(`✅ Found ${data.length} sales`);

    const sales: DVFSale[] = data.map((row: any) => {
      const lat = parseFloat(row.latitude) || latitude;
      const lon = parseFloat(row.longitude) || longitude;
      const distance = calculateDistance(latitude, longitude, lat, lon);

      return {
        id: row.id,
        date: row.date_mutation,
        price: row.valeur_fonciere,
        surface: row.surface_reelle_bati,
        rooms: row.nombre_pieces_principales || rooms,
        type: row.type_local,
        address: `${row.adresse_numero || ''} ${row.adresse_nom_voie || ''}, ${row.nom_commune}`.trim(),
        latitude: lat,
        longitude: lon,
        distance,
        pricePerSqm: row.valeur_fonciere / row.surface_reelle_bati,
      };
    });

    return sales.filter(s => s.distance !== undefined && s.distance <= radiusKm * 1000).sort((a, b) => a.distance! - b.distance!);

  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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

export async function getSalesAtAddress(
  address: string,
  city: string,
  postalCode: string
): Promise<DVFSale[]> {
  try {
    const { data, error } = await supabase
      .from('ventes_dvf')
      .select('*')
      .ilike('adresse_nom_voie', `%${address}%`)
      .eq('code_postal', postalCode)
      .order('date_mutation', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      date: row.date_mutation,
      price: row.valeur_fonciere,
      surface: row.surface_reelle_bati,
      rooms: row.nombre_pieces_principales || 0,
      type: row.type_local,
      address: `${row.adresse_numero || ''} ${row.adresse_nom_voie || ''}, ${row.nom_commune}`.trim(),
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      distance: 0,
      pricePerSqm: row.valeur_fonciere / row.surface_reelle_bati,
    }));

  } catch (error) {
    console.error('❌ Error fetching address history:', error);
    return [];
  }
}
