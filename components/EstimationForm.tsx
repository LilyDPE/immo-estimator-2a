'use client';

import { useState } from 'react';
import { PropertyDetails, DPEGrade } from '@/types';

interface EstimationFormProps {
  onSubmit: (property: PropertyDetails) => void;
  isLoading: boolean;
}

export default function EstimationForm({ onSubmit, isLoading }: EstimationFormProps) {
  const [formData, setFormData] = useState<PropertyDetails>({
    address: {
      street: '',
      city: '',
      postalCode: '',
    },
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
      <h2 className="text-2xl font-bold mb-6 text-primary">
        Informations du bien
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="label">
            Adresse complète <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: 10 rue de la Paix"
            value={formData.address.street}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value },
              })
            }
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Ville <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Paris"
              value={formData.address.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value },
                })
              }
              required
            />
          </div>
          <div>
            <label className="label">
              Code postal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: 75001"
              maxLength={5}
              pattern="\d{5}"
              value={formData.address.postalCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, postalCode: e.target.value },
                })
              }
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Surface (m²) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              min="10"
              max="1000"
              value={formData.surface}
              onChange={(e) =>
                setFormData({ ...formData, surface: parseInt(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <label className="label">
              Nombre de pièces <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              min="1"
              max="20"
              value={formData.rooms}
              onChange={(e) =>
                setFormData({ ...formData, rooms: parseInt(e.target.value) })
              }
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dpe: e.target.value ? (e.target.value as DPEGrade) : undefined,
                })
              }
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
            <label className="label">Étage (optionnel)</label>
            <input
              type="number"
              className="input-field"
              min="0"
              max="50"
              placeholder="Ex: 3"
              value={formData.floor ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  floor: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <p className="label">Options (optionnel)</p>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded focus:ring-primary"
            checked={formData.hasParking}
            onChange={(e) =>
              setFormData({ ...formData, hasParking: e.target.checked })
            }
          />
          <span>Parking / Garage</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded focus:ring-primary"
            checked={formData.hasCellar}
            onChange={(e) =>
              setFormData({ ...formData, hasCellar: e.target.checked })
            }
          />
          <span>Cave</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded focus:ring-primary"
            checked={formData.hasBalcony}
            onChange={(e) =>
              setFormData({ ...formData, hasBalcony: e.target.checked })
            }
          />
          <span>Balcon / Terrasse</span>
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
