import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 86400 }); // Cache 24h

interface DVFSale {
  date: string;
  price: number;
  surface: number;
  pricePerSqm: number;
  address: string;
  distance?: number;
}

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
    
    // Bounding box
    const latDelta = radiusKm / 111.32;
    const lonDelta = radiusKm / (111.32 * Math.cos(latitude * Math.PI / 180));
    
    const lat_min = latitude - latDelta;
    const lat_max = latitude + latDelta;
    const lon_min = longitude - lonDelta;
    const lon_max = longitude + lonDelta;

    // Date (3 ans en arrière)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    const date_mutation = startDate.toISOString().split('T')[0];

    // Construction URL avec bounding box
    const params = new URLSearchParams({
      lat_min: lat_min.toString(),
      lat_max: lat_max.toString(),
      lon_min: lon_min.toString(),
      lon_max: lon_max.toString(),
      date_mutation: date_mutation
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
    console.log(`📦 API returned ${data.features?.length || 0} features`);

    if (!data.features || data.features.length === 0) {
      console.log('⚠️ No results');
      return [];
    }

    // Transformation
    const sales: DVFSale[] = data.features
      .filter((f: any) => 
        f.properties?.valeur_fonciere > 0 && 
        f.properties?.surface_reelle_bati > 10 &&
        f.geometry?.coordinates?.[0] &&
        f.geometry?.coordinates?.[1]
      )
      .map((f: any) => {
        const props = f.properties;
        const [lon, lat] = f.geometry.coordinates;
        const dist = calculateDistance(latitude, longitude, lat, lon);
        
        return {
          date: props.date_mutation,
          price: props.valeur_fonciere,
          surface: props.surface_reelle_bati,
          pricePerSqm: Math.round(props.valeur_fonciere / props.surface_reelle_bati),
          address: `${props.adresse_numero || ''} ${props.adresse_nom_voie || ''}, ${props.code_commune || ''}`.trim(),
          distance: dist
        };
      })
      .filter((s: DVFSale) => s.distance !== undefined && s.distance <= radiusKm)
      .sort((a: DVFSale, b: DVFSale) => (a.distance || 0) - (b.distance || 0))
      .slice(0, maxResults);

    console.log(`✅ Found ${sales.length} sales`);
    
    cache.set(cacheKey, sales);
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
