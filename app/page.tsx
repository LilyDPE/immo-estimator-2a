'use client';

import { useState } from 'react';
import EstimationForm from '@/components/EstimationForm';
import EstimationResults from '@/components/EstimationResults';
import { PropertyDetails, EstimationResult } from '@/types';

export default function Home() {
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async (property: PropertyDetails) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'estimation');
      }

      const data: EstimationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('Estimation error:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEstimation = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {!result ? (
        <>
          <section className="bg-gradient-to-br from-primary via-primary-600 to-primary-700 text-white py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Estimez votre bien immobilier gratuitement
                </h1>
                <p className="text-xl text-blue-100 mb-8">
                  Obtenez une estimation précise en moins de 30 secondes grâce aux données officielles DVF
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>100% Gratuit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Données officielles</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Instantané</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="container mx-auto px-4">
              {error && (
                <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Erreur</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <EstimationForm onSubmit={handleEstimate} isLoading={isLoading} />
            </div>
          </section>

          <section className="bg-white py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12 text-primary">
                Comment ça marche ?
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Renseignez votre bien</h3>
                  <p className="text-gray-600">
                    Adresse, surface, nombre de pièces et quelques caractéristiques
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Analyse en temps réel</h3>
                  <p className="text-gray-600">
                    Notre algorithme analyse les ventes comparables autour de chez vous
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Recevez votre estimation</h3>
                  <p className="text-gray-600">
                    Fourchette de prix, ventes comparables et niveau de confiance
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6 text-primary">
                  Des données fiables et officielles
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Nos estimations sont basées sur les données DVF (Demandes de Valeurs Foncières), 
                  la base officielle des transactions immobilières en France fournie par le gouvernement.
                </p>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <p className="text-3xl font-bold text-secondary mb-2">8.5M+</p>
                    <p className="text-sm text-gray-600">Ventes analysées</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <p className="text-3xl font-bold text-secondary mb-2">100%</p>
                    <p className="text-sm text-gray-600">Données officielles</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <p className="text-3xl font-bold text-secondary mb-2">&lt;30s</p>
                    <p className="text-sm text-gray-600">Temps d'estimation</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <p className="text-3xl font-bold text-secondary mb-2">Gratuit</p>
                    <p className="text-sm text-gray-600">Sans engagement</p>
                  </div>
                </div>
