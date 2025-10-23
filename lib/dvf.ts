import { PropertyDetails, EstimationResult, DVFSale, DPEGrade } from '@/types';
import { searchComparableSales, getMarketStatistics } from './dvf';

const INITIAL_RADIUS_KM = 1;
const MAX_RADIUS_KM = 10;
const RADIUS_STEP_KM = 1;
const MIN_COMPARABLES = 3;

async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ latitude: number; longitude: number }> {
  const fullAddress = `${address}, ${postalCode} ${city}, France`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodedAddress}&limit=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erreur lors du géocodage de l\'adresse');
  }

  const data = await response.json();
  if (!data.features || data.features.length === 0) {
    throw new Error('Adresse introuvable');
  }

  const [longitude, latitude] = data.features[0].geometry.coordinates;
  return { latitude, longitude };
}

export async function estimateProperty(property: PropertyDetails): Promise<EstimationResult> {
  const geocoding = await geocodeAddress(
    property.address.street,
    property.address.postalCode,
    property.address.city
  );

  let comparables: DVFSale[] = [];
  let currentRadius = INITIAL_RADIUS_KM;

  while (comparables.length < MIN_COMPARABLES && currentRadius <= MAX_RADIUS_KM) {
    const newComparables = await searchComparableSales(
      geocoding.latitude,
      geocoding.longitude,
      currentRadius,
      property.propertyType,
      property.surface,
      property.address.postalCode // ✅ AJOUTÉ
    );

    comparables = [...comparables, ...newComparables].filter((sale, index, self) =>
      index === self.findIndex(s => s.id === sale.id)
    );

    if (comparables.length < MIN_COMPARABLES) {
      currentRadius += RADIUS_STEP_KM;
    }
  }

  const radiusUsed = currentRadius;

  if (comparables.length < MIN_COMPARABLES) {
    const marketAnalysis = await getMarketStatistics(
      geocoding.latitude,
      geocoding.longitude,
      5,
      property.address.postalCode // ✅ AJOUTÉ
    );

    return {
      property: {
        ...property,
        address: { ...property.address, latitude: geocoding.latitude, longitude: geocoding.longitude }
      },
      estimatedPrice: { low: 0, median: 0, high: 0 },
      pricePerSqm: { low: 0, median: 0, high: 0 },
      comparables: [],
      confidenceScore: 0,
      confidenceStars: 0,
      adjustments: { dpe: 0, floor: 0, parking: 0, cellar: 0, balcony: 0, pool: 0, land: 0, condition: 0 },
      marketAnalysis,
      createdAt: new Date().toISOString(),
    };
  }

  const weightedPricesPerSqm = comparables.map(sale => {
    const distanceWeight = Math.max(0.1, 1 - (sale.distance! / (radiusUsed * 1000)));
    const saleDate = new Date(sale.date);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const ageWeight = Math.max(0.3, 1 - (monthsAgo / 36));
    const surfaceDiff = Math.abs(sale.surface - property.surface) / property.surface;
    const surfaceWeight = Math.max(0.5, 1 - surfaceDiff);
    const totalWeight = distanceWeight * ageWeight * surfaceWeight;
    
    return { pricePerSqm: sale.pricePerSqm, weight: totalWeight };
  });

  const sortedPrices = weightedPricesPerSqm.sort((a, b) => a.pricePerSqm - b.pricePerSqm);
  const totalWeight = sortedPrices.reduce((sum, p) => sum + p.weight, 0);
  let cumulativeWeight = 0;
  let medianPricePerSqm = sortedPrices[Math.floor(sortedPrices.length / 2)].pricePerSqm;
  
  for (const item of sortedPrices) {
    cumulativeWeight += item.weight;
    if (cumulativeWeight >= totalWeight / 2) {
      medianPricePerSqm = item.pricePerSqm;
      break;
    }
  }

  const p25Index = Math.floor(sortedPrices.length * 0.25);
  const p75Index = Math.floor(sortedPrices.length * 0.75);
  const lowPricePerSqm = sortedPrices[p25Index].pricePerSqm;
  const highPricePerSqm = sortedPrices[p75Index].pricePerSqm;

  const adjustments = calculateAdjustments(property, medianPricePerSqm);
  
  const adjustedMedianPricePerSqm = medianPricePerSqm + adjustments.dpe;
  const basePrice = adjustedMedianPricePerSqm * property.surface;
  
  const totalAdjustments = adjustments.floor + adjustments.parking + adjustments.cellar + 
                          adjustments.balcony + adjustments.pool + adjustments.land + adjustments.condition;
  
  const estimatedPrice = {
    low: Math.round((lowPricePerSqm * property.surface + totalAdjustments * 0.8) / 1000) * 1000,
    median: Math.round((basePrice + totalAdjustments) / 1000) * 1000,
    high: Math.round((highPricePerSqm * property.surface + totalAdjustments * 1.2) / 1000) * 1000,
  };

  const pricePerSqm = {
    low: Math.round(lowPricePerSqm),
    median: Math.round(adjustedMedianPricePerSqm),
    high: Math.round(highPricePerSqm),
  };

  const confidenceScore = calculateConfidenceScore(comparables, geocoding.latitude, geocoding.longitude, radiusUsed);
  const confidenceStars = Math.ceil(confidenceScore / 20);

  const marketAnalysis = await getMarketStatistics(
    geocoding.latitude, 
    geocoding.longitude, 
    5,
    property.address.postalCode // ✅ AJOUTÉ
  );

  return {
    property: {
      ...property,
      address: { ...property.address, latitude: geocoding.latitude, longitude: geocoding.longitude }
    },
    estimatedPrice,
    pricePerSqm,
    comparables: comparables.slice(0, 23),
    confidenceScore,
    confidenceStars,
    adjustments: {
      dpe: Math.round(adjustments.dpe * property.surface),
      floor: adjustments.floor,
      parking: adjustments.parking,
      cellar: adjustments.cellar,
      balcony: adjustments.balcony,
      pool: adjustments.pool,
      land: adjustments.land,
      condition: adjustments.condition,
    },
    marketAnalysis,
    createdAt: new Date().toISOString(),
  };
}

function calculateAdjustments(property: PropertyDetails, basePricePerSqm: number) {
  let dpeAdjustment = 0;
  let floorAdjustment = 0;
  let conditionAdjustment = 0;
  let landAdjustment = 0;
  
  if (property.dpe) {
    const dpeValues: Record<DPEGrade, number> = {
      'A': 0.10, 'B': 0.05, 'C': 0, 'D': 0, 'E': -0.05, 'F': -0.10, 'G': -0.15, 'NC': 0
    };
    dpeAdjustment = basePricePerSqm * dpeValues[property.dpe];
  }

  if (property.propertyType === 'apartment' && property.floor !== undefined) {
    if (property.floor === 0) {
      floorAdjustment = property.hasElevator ? -3000 : -5000;
    } else if (property.floor > 4) {
      const floorsAbove4 = property.floor - 4;
      floorAdjustment = property.hasElevator ? Math.min(floorsAbove4 * 2000, 10000) : Math.min(floorsAbove4 * 3000, 15000);
    }
  }

  if (property.condition) {
    const conditionValues = {
      'new': 20000,
      'renovated': 10000,
      'good': 0,
      'to_renovate': -15000
    };
    conditionAdjustment = conditionValues[property.condition];
  }

  if (property.landArea && property.propertyType === 'house') {
    landAdjustment = Math.min(property.landArea * 50, 50000);
  }

  return {
    dpe: dpeAdjustment,
    floor: floorAdjustment,
    parking: (property.parkingSpaces || 0) * 15000,
    cellar: property.hasCellar ? 5000 : 0,
    balcony: property.balconyArea ? Math.min(property.balconyArea * 500, 15000) : 0,
    pool: property.hasPool ? 25000 : 0,
    land: landAdjustment,
    condition: conditionAdjustment,
  };
}

function calculateConfidenceScore(comparables: DVFSale[], targetLat: number, targetLon: number, radiusUsed: number): number {
  let score = 0;
  const countScore = Math.min((comparables.length / 20) * 40, 40);
  score += countScore;
  
  const avgDistance = comparables.reduce((sum, c) => sum + c.distance!, 0) / comparables.length;
  const distanceScore = Math.max(0, 30 - (avgDistance / (radiusUsed * 500)) * 30);
  score += distanceScore;
  
  const avgAge = comparables.reduce((sum, c) => {
    const saleDate = new Date(c.date);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return sum + monthsAgo;
  }, 0) / comparables.length;
  const ageScore = Math.max(0, 15 - (avgAge / 6) * 15);
  score += ageScore;
  
  const prices = comparables.map(c => c.pricePerSqm).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const dispersion = prices.reduce((sum, p) => sum + Math.abs(p - median), 0) / prices.length / median;
  const dispersionScore = Math.max(0, 15 - dispersion * 150);
  score += dispersionScore;
  
  return Math.round(Math.min(score, 100));
}
