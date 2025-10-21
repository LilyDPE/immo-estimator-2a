import { NextRequest, NextResponse } from 'next/server';
import { estimateProperty } from '@/lib/estimation';
import { PropertyDetails } from '@/types';
import { z } from 'zod';

const PropertySchema = z.object({
  propertyType: z.enum(['apartment', 'house']),
  address: z.object({
    street: z.string().min(1, 'Adresse requise'),
    city: z.string().min(1, 'Ville requise'),
    postalCode: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  }),
  surface: z.number().min(10, 'Surface minimale: 10m²').max(1000, 'Surface maximale: 1000m²'),
  rooms: z.number().min(1, 'Minimum 1 pièce').max(20, 'Maximum 20 pièces'),
  landArea: z.number().min(0).max(50000).optional(),
  dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']).optional(),
  floor: z.number().min(0).max(50).optional(),
  hasElevator: z.boolean().optional(),
  constructionYear: z.number().min(1800).max(2025).optional(),
  condition: z.enum(['new', 'renovated', 'good', 'to_renovate']).optional(),
  parkingSpaces: z.number().min(0).max(10).optional(),
  hasCellar: z.boolean().optional(),
  balconyArea: z.number().min(0).max(500).optional(),
  hasPool: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = PropertySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      );
    }

    const property: PropertyDetails = validation.data;

    console.log('📊 Estimating property:', property.address);
    const result = await estimateProperty(property);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('❌ Estimation error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de l\'estimation',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
