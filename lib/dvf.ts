import NodeCache from 'node-cache';
import { DVFSale } from '@/types';

const cache = new NodeCache({ stdTTL: 86400 }); // Cache 24h

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

export async function searchComparableSales(
  latitude: number,
  longitude: number,
  surface: number,
  years: number = 3,
  radiusKm: number = 5,
  maxResults: number = 50
): Promise<DVFSale[]> {
  const cacheKey = `dvf_${latitude}_${longitude}_${surface}_${years}_${radiusKm}`;
  
  const cached = cache.get<DVFSale[]>(cacheKey);
  if (cached) {
    console.log('✅ Cache hit');
    return cached;
  }

  try {
    console.log(`🔍 Searching DVF: lat=${latitude}, lon=${longitude}, radius=${radiusKm}km`);
    
    // Conversion radius en mètres (l'API attend des mètres)
    const distMeters = radiusKm * 1000;

    // Construction URL avec les BONS paramètres
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      dist: distMeters.toString(),
      nature_mutation: 'Vente'
    });

    const url = `https://api.cquest.org/dvf?${params.toString()}`;
    console.log('📡 API URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`📦 API returned:`, JSON.stringify(data).substring(0, 200));

    // L'API retourne soit features[] (GeoJSON) soit resultats[]
    const results = data.features || data.resultats || [];
    console.log(`📊 Found ${results.length} raw results`);

    if (results.length === 0) {
      console.log('⚠️ No results from API');
      return [];
    }

    // Transformation
    const sales: DVFSale[] = results
      .filter((item: any) => {
        const props = item.properties || item;
        return (
          props.valeur_fonciere > 0 && 
          props.surface_reelle_bati > 10 &&
          (props.type_local === 'Maison' || props.type_local === 'Appartement')
        );
      })
      .map((item: any) => {
        const props = item.properties || item;
        const coords = item.geometry?.coordinates || [props.longitude, props.latitude];
        const [lon, lat] = coords;
        
        const dist = lat && lon ? calculateDistance(latitude, longitude, lat, lon) : 0;
        
        return {
          id: generateId(),
          date: props.date_mutation,
          price: props.valeur_fonciere,
          surface: props.surface_reelle_bati,
          rooms: props.nombre_pieces_principales || 0,
          type: props.type_local || 'unknown',
          address: `${props.adresse_numero || ''} ${props.adresse_nom_voie || ''}, ${props.code_commune || ''}`.trim(),
          latitude: lat || 0,
          longitude: lon || 0,
          distance: dist,
          pricePerSqm: Math.round(props.valeur_fonciere / props.surface_reelle_bati)
        };
      })
      .filter((s: DVFSale) => s.distance !== undefined && s.distance <= radiusKm)
      .sort((a: DVFSale, b: DVFSale) => (a.distance || 0) - (b.distance || 0))
      .slice(0, maxResults);

    console.log(`✅ Found ${sales.length} comparable sales`);
    
    if (sales.length > 0) {
      cache.set(cacheKey, sales);
    }
    
    return sales;

  } catch (error) {
    console.error('❌ Error:', error);
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
