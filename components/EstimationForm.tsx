'use client';

import { useState } from 'react';
import { PropertyDetails } from '@/types';

interface Props {
  onSubmit: (property: PropertyDetails) => void;
  isLoading: boolean;
}

export default function EstimationForm({ onSubmit, isLoading }: Props) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [surface, setSurface] = useState(70);
  const [rooms, setRooms] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      address: { street, city, postalCode },
      surface,
      rooms,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-primary">Informations du bien</h2>
      
      <div className="space-y-4">
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
        
        <div className="grid grid-cols-2 gap-4">
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Surface (m²) *</label>
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
      </div>
      
      <button type="submit" className="btn-primary w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Estimation en cours...' : 'Estimer mon bien gratuitement'}
      </button>
      
      <p className="text-sm text-gray-500 mt-4 text-center">
        Estimation gratuite basée sur les données officielles DVF
      </p>
    </form>
  );
}
