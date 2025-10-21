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
    console.log('✅ DVF data from cache');
    return cached;
  }

  console.log('🔍 Fetching DVF data from API...');

  try {
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const minDate = threeYearsAgo.toISOString().split('T')[0];

    const minSurface = Math.max(surface * 0.7, 20);
    const maxSurface = surface * 1.3;

    const url = `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}&fields=code,nom,codesPostaux&format=json&geometry=centre`;
    
    const geoResponse = await fetch(url);
    if (!geoResponse.ok) {
      throw new Error(`Geo API error: ${geoResponse.status}`);
    }
    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      throw new Error('Commune non trouvée');
    }

    const codeCommune = geoData[0].code;
    console.log(`📍 Code commune: ${codeCommune} (${geoData[0].nom})`);

    const dvfUrl = new URL('https://api.cquest.org/dvf');
    dvfUrl.searchParams.append('code_commune', codeCommune);
    dvfUrl.searchParams.append('nature_mutation', 'Vente');
    dvfUrl.searchParams.append('type_local', 'Maison');
    dvfUrl.searchParams.append('type_local', 'Appartement');

    console.log('🔗 DVF URL:', dvfUrl.toString());

    const response = await fetch(dvfUrl.toString(), {
      headers: {
        'User-Agent': 'ImmoEstimator/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ DVF API error:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('📦 DVF Response:', data);

    if (!data.resultats || !Array.isArray(data.resultats)) {
      console.log('⚠️ No results in DVF data');
      return [];
    }

    const sales: DVFSale[] = data.resultats
      .filter((sale: any) => {
        const saleDate = new Date(sale.date_mutation);
        return (
          sale.valeur_fonciere > 0 &&
          sale.surface_reelle_bati > 0 &&
          sale.surface_reelle_bati >= minSurface &&
          sale.surface_reelle_bati <= maxSurface &&
          saleDate >= threeYearsAgo &&
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
          id: sale.id_mutation || `${sale.date_mutation}_${sale.valeur_fonciere}`,
          date: sale.date_mutation,
          price: sale.valeur_fonciere,
          surface: sale.surface_reelle_bati,
          rooms: sale.nombre_pieces_principales || rooms,
          type: sale.type_local,
          address: `${sale.adresse_numero || ''} ${sale.adresse_nom_voie || ''}, ${sale.nom_commune}`.trim(),
          latitude: lat,
          longitude: lon,
          distance,
          pricePerSqm,
        };
      })
      .filter((sale: DVFSale) => sale.distance! <= radiusKm * 1000)
      .sort((a: DVFSale, b: DVFSale) => a.distance! - b.distance!)
      .slice(0, maxResults);

    console.log(`✅ Found ${sales.length} sales before filtering`);
    
    const filteredSales = sales.length >= 3 ? removeOutliers(sales) : sales;

    cache.set(cacheKey, filteredSales);
    
    console.log(`✅ Returning ${filteredSales.length} comparable sales`);
    return filteredSales;

  } catch (error) {
    console.error('❌ Error fetching DVF data:', error);
    return [];
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
    Math.cos(φ1) * Math.cos(φ2) *
