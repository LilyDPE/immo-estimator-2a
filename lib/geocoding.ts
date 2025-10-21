import { GeocodingResult } from '@/types';

const BAN_API = 'https://api-adresse.data.gouv.fr/search';

export async function geocodeAddress(
  street: string,
  city: string,
  postalCode: string
): Promise<GeocodingResult> {
  const query = `${street}, ${postalCode} ${city}`;
  
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '1',
      autocomplete: '0'
    });

    const response = await fetch(`${BAN_API}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Adresse non trouvée');
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      latitude,
      longitude,
      label: feature.properties.label,
      score: feature.properties.score,
      city: feature.properties.city,
      postcode: feature.properties.postcode,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Impossible de localiser cette adresse. Vérifiez qu\'elle est correcte.');
  }
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '5',
      autocomplete: '1'
    });

    const response = await fetch(`${BAN_API}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Search error: ${response.status}`);
    }

    const data = await response.json();

    return data.features.map((feature: any) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return {
        latitude,
        longitude,
        label: feature.properties.label,
        score: feature.properties.score,
        city: feature.properties.city,
        postcode: feature.properties.postcode,
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}
