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
          <s
