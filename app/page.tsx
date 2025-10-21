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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'estimation');
      }

      const data: EstimationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEstimation = () => {
    setResult(null);
    setError(null);
  };

  if (result) {
    return <EstimationResults result={result} onNewEstimation={handleNewEstimation} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary via-primary-600 to-primary-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Estimez votre bien immobilier gratuitement
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Estimation précise en 30 secondes avec les données officielles DVF
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {error && (
            <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              <p className="font-semibold">Erreur</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          <EstimationForm onSubmit={handleEstimate} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
