'use client';

import { useState } from 'react';
import { PropertyDetails, DPEGrade } from '@/types';

interface EstimationFormProps {
  onSubmit: (property: PropertyDetails) => void;
  isLoading: boolean;
}

export default function EstimationForm({ onSubmit, isLoading }: EstimationFormProps) {
  const [formData, setFormData] = useState<PropertyDetails>({
    address: { street: '', city: '', postalCode: '' },
    surface: 70,
    rooms: 3,
    dpe: undefined,
    floor: undefined,
    hasParking: false,
    hasCellar: false,
    hasBalcony: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-primary">Informations du bien</h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="label">Adresse complète *</label>
          <input
            type="text"
            className="input-field"
            placeholder="10 rue de la Paix"
            value={formData.address.street}
            onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Ville *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Paris"
              value={formData.address.city}
              onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
              required
            />
          </div>
          <div>
            <label className="label">Code postal *</label>
            <input
              type="text"
              className="input-field"
              placeholder="75001"
              maxLength={5}
              pattern="\d{5}"
              value={formData.address.postalCode}
              onChange={(e) => setFormData({...formData, address: {...formData.address, postalCode: e.target.value}})}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Surface (m²) *</label>
            <input
              type="number"
              className="input-field"
              min="10"
              max="1000"
              value={formData.surface}
              onChange={(e) => setFormData({...formData, surface: parseInt(e.target.value)})}
              required
            />
          </div>
          <div>
            <label className="label">Nombre de pièces *</label>
            <input
              type="number"
              className="input-field"
              min="1"
              max="20"
              value={formData.rooms}
              onChange={(e) => setFormData({...formData, rooms: parseInt(e.target.value)})}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">DPE (optionnel)</label>
            <select
              className="input-field"
              value={formData.dpe || ''}
              onChange={(e) => setFormData({...formData, dpe: e.target.value ? (e.target.value as DPEGrade) : undefined})}
            >
              <option value="">Non renseigné</option>
              <option value="A">A - Excellent</option>
              <option value="B">B - Très bon</option>
              <opti
