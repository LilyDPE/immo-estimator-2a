import { PropertyDetails, EstimationResult, DVFSale, DPEGrade } from '@/types';
import { searchComparableSales, getMarketStatistics } from './dvf';
import { geocodeAddress } from './geocoding';

export async function estimateProperty(property: PropertyDetails): Promise<EstimationResult> {
  console.log('🏠 Starting property estimation...');

  let geocoding;
  try {
    geocoding = await geocodeAddress(property.address.street, property.address.city, property.address.postalCode);
  } catch (error) {
    throw new Error('Adresse introuvable. Vérifiez qu\'elle est correcte.');
  }

  let comparables: DVFSale[] = [];
  let radiusUsed = 2;
  
  for (const radius of [2, 5, 10]) {
    comparables = await searchComparableSales(
      geocoding.latitude,
      geocoding.longitude,
      property.surface,
      3, // years
      radius,
      50,
      property.address.postalCode // ⬅️ AJOUTÉ
    );
    
    if (comparables.length >= 3) {
      radiusUsed = radius;
      break;
    }
  }

  if (comparables.length < 3) {
    const marketStats = await getMarketStatistics(
      geocoding.latitude, 
      geocoding.longitude, 
      15,
      property.address.postalCode // ⬅️ AJOUTÉ
    );
    
    throw new Error(
      `Données insuffisantes pour une estimation fiable (${comparables.length} vente(s) trouvée(s), minimum 3 requis).\n\n` +
      `💡 Prix moyen indicatif dans la région : ${Math.round(marketStats.averagePrice / 1000)}K€\n` +
      `Prix au m² moyen : ${Math.round(marketStats.medianPrice / 70)} €/m²\n\n` +
      `Suggestion : Contactez-nous au 0686386259 pour une estimation manuelle personnalisée.`
    );
  }

  const weightedPricesPerSqm = comparables.map((sale) => {
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
    property.address.postalCode // ⬅️ AJOUTÉ
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
      'ren
