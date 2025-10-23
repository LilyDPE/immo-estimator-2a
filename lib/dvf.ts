import NodeCache from 'node-cache';
import { DVFSale } from '@/types';

const cache = new NodeCache({ stdTTL: 86400 });

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

// Obtenir le code commune à partir de coordonnées GPS
async function getCommuneCode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=code&format=json&geometry=centre`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data[0]?.code || null;
  } catch (error) {
    console.error('Error getting commune code:', error);
    return null;
  }
}

// Obtenir les sections cadastrales d'une commune
async function getSections(codeCommune: string): Promise<string[]> {
  try {
    const url = `https://app.dvf.etalab.gouv.fr/api/sections/${codeCommune}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.sections || [];
  } catch (error) {
    console.error('Error getting sections:', error);
    return [];
  }
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
    
    // 1. Obtenir le code commune
    const codeCommune = await getCommuneCode(latitude, longitude);
    if (!codeCommune) {
      console.log('⚠️ Could not get commune code');
      return [];
    }
    console.log(`📍 Commune code: ${codeCommune}`);

    // 2. Obtenir toutes les sections de la commune
    const sections = await getSections(codeCommune);
    console.log(`📊 Found ${sections.length} sections`);

    if (sections.length === 0) {
      return [];
    }

    // 3. Interroger chaque section (limiter aux premières pour performance)
    const maxSections = Math.min(sections.length, 10); // Limiter à 10 sections
    const allMutations: any[] = [];

    for (let i = 0; i < maxSections; i++) {
      const section = sections[i];
      try {
        const url = `https://app.dvf.etalab.gouv.fr/api/mutations3/${codeCommune}/${section}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.mutations) {
            allMutations.push(...data.mutations);
          }
        }
      } catch (error) {
        console.log(`Error fetching section ${section}:`, error);
      }
    }

    console.log(`📦 Found ${allMutations.length} mutations`);

    // 4. Filtrer et transformer
    const sales: DVFSale[] = allMutations
      .filter((m: any) => {
        // Filtrer par type (Maison ou Appartement)
        if (m.type_local !== 'Maison' && m.type_local !== 'Appartement') return false;
        
        // Filtrer par valeur foncière et surface
        const valeur = parseFloat(m.valeur_fonciere);
        const surf = parseFloat(m.surface_reelle_bati);
        if (!valeur || valeur <= 0 || !surf || surf < 10) return false;

        // Filtrer par date (X dernières années)
        const saleDate = new Date(m.date_mutation);
        const limitDate = new Date();
        limitDate.setFullYear(limitDate.getFullYear() - years);
        if (saleDate < limitDate) return false;

        return true;
      })
      .map((m: any) => {
        // Comme on n'a pas les coordonnées exactes, on utilise le centre de la commune
        // Ce n'est pas parfait mais c'est mieux que rien
        const dist = 0; // On ne peut pas calculer la distance précise

        return {
          id: generateId(),
          date: m.date_mutation,
          price: parseFloat(m.valeur_fonciere),
          surface: parseFloat(m.surface_reelle_bati),
          rooms: parseFloat(m.nombre_pieces_principales) || 0,
          type: m.type_local,
          address: `${m.adresse_numero || ''} ${m.adresse_nom_voie || ''}, ${m.nom_commune || ''}`.trim(),
          latitude: latitude, // Approximation
          longitude: longitude, // Approximation
          distance: dist,
          pricePerSqm: Math.round(parseFloat(m.valeur_fonciere) / parseFloat(m.surface_reelle_bati))
        };
      })
      .slice(0, maxResults);

    console.log(`✅ Returning ${sales.length} sales`);
    
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
