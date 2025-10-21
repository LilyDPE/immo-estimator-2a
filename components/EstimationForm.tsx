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
        <input
          type="text"
          className="input-field"
          placeholder="Adresse (ex: 10 rue de la Paix)"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            className="input-field"
            placeholder="Ville"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          <input
            type="text"
            className="input-field"
            placeholder="Code postal"
            maxLength={5}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            className="input-field"
            placeholder="Surface m²"
            value={surface}
            onChange={(e) => setSurface(Number(e.target.value))}
            required
          />
          <input
            type="number"
            className="input-field"
            placeholder="Pièces"
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
            required
          />
        </div>
      </div>
      
      <button type="submit" className="btn-primary w-full mt-6" disabled={isLoading}>
        {isLoading ? 'Estimation en cours...' : 'Estimer mon bien'}
      </button>
    </form>
  );
}

