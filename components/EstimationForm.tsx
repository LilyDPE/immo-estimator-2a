'use client';

import { useState } from 'react';
import { PropertyDetails, DPEGrade } from '@/types';

interface Props {
  onSubmit: (property: PropertyDetails) => void;
  isLoading: boolean;
}

export default function EstimationForm({ onSubmit, isLoading }: Props) {
  const [propertyType, setPropertyType] = useState<'apartment' | 'house'>('apartment');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [surface, setSurface] = useState(70);
  const [rooms, setRooms] = useState(3);
  const [landArea, setLandArea] = useState<number | undefined>();
  const [dpe, setDpe] = useState<DPEGrade | undefined>();
  const [floor, setFloor] = useState<number | undefined>();
  const [hasElevator, setHasElevator] = useState(false);
  const [condition, setCondition] = useState<'new' | 'renovated' | 'good' | 'to_renovate' | undefined>();
  const [parkingSpaces, setParkingSpaces] = useState<number>(0);
  const [hasCellar, setHasCellar] = useState(false);
  const [balconyArea, setBalconyArea] = useState<number | undefined>();
  const [hasPool, setHasPool] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      propertyType,
      address: { street, city, postalCode },
      surface,
      rooms,
      landArea: propertyType === 'house' ? landArea : undefined,
      dpe,
      floor: propertyType === 'apartment' ? floor : undefined,
      hasElevator: propertyType === 'apartment' ? hasElevator : undefined,
      condition,
      parkingSpaces: parkingSpaces > 0 ? parkingSpaces : undefined,
      hasCellar,
      balconyArea,
      hasPool: propertyType === 'house' ? hasPool : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-primary">Informations du bien</h2>
      
      <div className="space-y-6">
        <div>
          <label className="label">Type de bien *</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPropertyType('apartment')}
              className={`p-4 border-2 rounded-lg font-medium transition-all ${
                propertyType === 'apartment'
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🏢 Appartement
            </button>
            <button
              type="button"
              onClick={() => setPropertyType('house')}
              className={`p-4 border-2 rounded-lg font-medium transition-all ${
                propertyType === 'house'
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🏡 Maison
            </button>
          </div>
        </div>

        <div>
          <label className="label">Adresse complète *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: 10 rue de la Paix"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Ville *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Paris"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Code postal *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: 75001"
              maxLength={5}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Surface habitable (m²) *</label>
            <input
              type="number"
              className="input-field"
              placeholder="Ex: 70"
              min="10"
              max="1000"
              value={surface}
              onChange={(e) => setSurface(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label">Nombre de pièces *</label>
            <input
              type="number"
              className="input-field"
              placeholder="Ex: 3"
              min="1"
              max="20"
              value={rooms}
              onChange={(e) => setRooms(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {propertyType === 'house' && (
          <div>
            <label className="label">Surface du terrain (m²)</label>
            <input
              type="number"
              className="input-field"
              placeholder="Ex: 500"
              min="0"
              max="50000"
              value={landArea || ''}
              onChange={(e) => setLandArea(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">DPE</label>
            <select
              className="input-field"
              value={dpe || ''}
              onChange={(e) => setDpe(e.target.value ? (e.target.value as DPEGrade) : undefined)}
            >
              <option value="">Non renseigné</option>
              <option value="A">A - Excellent</option>
              <option value="B">B - Très bon</option>
              <option value="C">C - Bon</option>
              <option value="D">D - Moyen</option>
              <option value="E">E - Passable</option>
              <option value="F">F - Médiocre</option>
              <option value="G">G - Mauvais</option>
            </select>
          </div>
          <div>
            <label className="label">État du bien</label>
            <select
              className="input-field"
              value={condition || ''}
              onChange={(e) => setCondition(e.target.value as any || undefined)}
            >
              <option value="">Non renseigné</option>
              <option value="new">Neuf</option>
              <option value="renovated">Rénové</option>
              <option value="good">Bon état</option>
              <option value="to_renovate">À rénover</option>
            </select>
          </div>
        </div>

        {propertyType === 'apartment' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Étage</label>
              <input
                type="number"
                className="input-field"
                placeholder="Ex: 3"
                min="0"
                max="50"
                value={floor ?? ''}
                onChange={(e) => setFloor(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer pb-3">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={hasElevator}
                  onChange={(e) => setHasElevator(e.target.checked)}
                />
                <span>Ascenseur</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Parking/Garage</label>
            <input
              type="number"
              className="input-field"
              placeholder="0"
              min="0"
              max="10"
              value={parkingSpaces}
              onChange={(e) => setParkingSpaces(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Balcon/Terrasse (m²)</label>
            <input
              type="number"
              className="input-field"
              placeholder="0"
              min="0"
              max="500"
              value={balconyArea || ''}
              onChange={(e) => setBalconyArea(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-3 cursor-pointer pb-3">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={hasCellar}
                onChange={(e) => setHasCellar(e.target.checked)}
              />
              <span>Cave</span>
            </label>
          </div>
        </div>

        {propertyType === 'house' && (
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={hasPool}
                onChange={(e) => setHasPool(e.target.checked)}
              />
              <span className="font-medium">Piscine</span>
            </label>
          </div>
        )}
      </div>
      
      <button type="submit" className="btn-primary w-full mt-8" disabled={isLoading}>
        {isLoading ? 'Estimation en cours...' : 'Estimer mon bien gratuitement'}
      </button>
      
      <p className="text-sm text-gray-500 mt-4 text-center">
        Estimation gratuite basée sur les données officielles DVF
      </p>
    </form>
  );
}
