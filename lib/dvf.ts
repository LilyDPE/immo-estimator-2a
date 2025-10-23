import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 86400 }); // 24h cache

interface DVFSale {
  date: string;
  price: number;
  surface: number;
  pricePerSqm: number;
  address: string;
  distance?: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
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
    console.log('✅ Returning cached results');
    return cached;
  }

  try {
    console.log(`🔍 Searching DVF data for lat=${latitude}, lon=${longitude}, radius=${radiusKm}km`);
    
    // Calcul de la bounding box
    const latDelta = (radiusKm / 111.32);
    const lonDelta = (radiusKm / (111.32 * Math.cos(latitude * Math.PI / 180)));
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    // Date limite (X années en arrière)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    const dateStr = startDate.toISOString().split('T')[0];

    // API DVF data.gouv.fr
    const url = `https://apidf-preprod.cerema.fr/api/v1/transactions/recherche`;
    
    const body = {
      rectangle: {
        lat_min: minLat,
        lat_max: maxLat,
        lon_min: minLon,
        lon_max: maxLon
      },
      date_min: dateStr,
      nature_mutation: ["Vente"],
      type_local: ["Maison", "Appartement"]
    };

    console.log('📡 API Request:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`📦 API returned ${data.resultats?.length || 0} results`);

    if (!data.resultats || data.resultats.length === 0) {
      console.log('⚠️ No results from API');
      return [];
    }

    // Transformation et filtrage des résultats
    const sales: DVFSale[] = data.resultats
      .filter((r: any) => 
        r.valeur_fonciere > 0 && 
        r.surface_reelle_bati > 10 &&
        r.latitude && r.longitude
      )
      .map((r: any) => {
        const dist = calculateDistance(latitude, longitude, r.latitude, r.longitude);
        return {
          date: r.date_mutation,
          price: r.valeur_fonciere,
          surface: r.surface_reelle_bati,
          pricePerSqm: Math.round(r.valeur_fonciere / r.surface_reelle_bati),
          address: r.adresse_numero + ' ' + r.adresse_nom_voie + ', ' + r.code_commune,
          distance: dist
        };
      })
      .filter((s: DVFSale) => s.distance && s.distance <= radiusKm)
      .sort((a: DVFSale, b: DVFSale) => (a.distance || 0) - (b.distance || 0))
      .slice(0, maxResults);

    console.log(`✅ Found ${sales.length} comparable sales`);
    
    cache.set(cacheKey, sales);
    return sales;

  } catch (error) {
    console.error('❌ DVF API Error:', error);
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
  const averagePrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  const medianPrice = prices[Math.floor(prices.length / 2)];

  return {
    averagePrice,
    medianPrice,
    numberOfSales: sales.length,
    period: '3 dernières années'
  };
}
