'use client';

import { EstimationResult } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface EstimationResultsProps {
  result: EstimationResult;
  onNewEstimation: () => void;
}

export default function EstimationResults({ result, onNewEstimation }: EstimationResultsProps) {
  const { estimatedPrice, pricePerSqm, confidenceStars, comparables, adjustments } = result;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="stat-card mb-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Estimation de votre bien</h2>
          <p className="text-blue-200 mb-6">{result.property.address.street}, {result.property.address.city}</p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-blue-200 text-sm mb-1">Fourchette basse</p>
              <p className="text-4xl font-bold">{formatCurrency(estimatedPrice.low)}</p>
              <p className="text-blue-200 text-sm">{formatCurrency(pricePerSqm.low)}/m²</p>
            </div>
            <div className="border-l border-r border-blue-400 px-4">
              <p className="text-blue-200 text-sm mb-1">Estimation médiane</p>
              <p className="text-5xl font-bold text-secondary">{formatCurrency(estimatedPrice.median)}</p>
              <p className="text-blue-200 text-sm">{formatCurrency(pricePerSqm.median)}/m²</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Fourchette haute</p>
              <p className="text-4xl font-bold">{formatCurrency(estimatedPrice.high)}</p>
              <p className="text-blue-200 text-sm">{formatCurrency(pricePerSqm.high)}/m²</p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-blue-200">Niveau de confiance:</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-6 h-6 ${i < confidenceStars ? 'text-yellow-400' : 'text-blue-300'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <h3 className="text-xl font-bold mb-4 text-primary">Ventes comparables ({comparables.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Adresse</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Surface</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Prix</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Prix/m²</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparables.slice(0, 10).map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(sale.date)}</td>
                  <td className="px-4 py-3 text-sm">{sale.address}</td>
                  <td className="px-4 py-3 text-sm text-right">{sale.surface} m²</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(sale.price)}</td>
                  <td className="px-4 py-3 text-sm text-right text-primary font-medium">{formatCurrency(sale.pricePerSqm)}/m²</td>
                  <td className="px-4 py-3 text-sm text-right">{Math.round(sale.distance!)}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button onClick={onNewEstimation} className="btn-secondary">Nouvelle estimation</button>
        <button onClick={() => window.print()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg">
          Imprimer
        </button>
      </div>

      <div className="card mt-8 bg-gradient-to-r from-primary to-primary-600 text-white">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Besoin d'un avis d'expert ?</h3>
          <p className="mb-6">Contactez-nous pour une estimation détaillée</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a href="tel:0686386259" className="bg-secondary hover:bg-secondary-600 text-white font-medium py-3 px-8 rounded-lg">
              📞 0686386259
            </a>
            <a href="mailto:contact@2a-immobilier.com" className="bg-white text-primary hover:bg-gray-100 font-medium py-3 px-8 rounded-lg">
              ✉️ Nous contacter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
