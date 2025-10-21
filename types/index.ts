export interface Address {
  street: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyDetails {
  address: Address;
  propertyType: 'apartment' | 'house';
  surface: number;
  rooms: number;
  landArea?: number;
  dpe?: DPEGrade;
  floor?: number;
  hasElevator?: boolean;
  constructionYear?: number;
  condition?: 'new' | 'renovated' | 'good' | 'to_renovate';
  parkingSpaces?: number;
  hasCellar?: boolean;
  balconyArea?: number;
  hasPool?: boolean;
}

export type DPEGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NC';

export interface DVFSale {
  id: string;
  date: string;
  price: number;
  surface: number;
  rooms: number;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  pricePerSqm: number;
}

export interface EstimationResult {
  property: PropertyDetails;
  estimatedPrice: {
    low: number;
    median: number;
    high: number;
  };
  pricePerSqm: {
    low: number;
    median: number;
    high: number;
  };
  comparables: DVFSale[];
  confidenceScore: number;
  confidenceStars: number;
  adjustments: {
    dpe: number;
    floor: number;
    parking: number;
    cellar: number;
    balcony: number;
    pool: number;
    land: number;
    condition: number;
  };
  marketAnalysis: {
    averagePrice: number;
    medianPrice: number;
    numberOfSales: number;
    period: string;
  };
  createdAt: string;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  label: string;
  score: number;
  city: string;
  postcode: string;
}
