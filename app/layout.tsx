import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ImmoEstimator - Estimation immobilière par 2A immo',
  description: 'Estimez la valeur de votre bien immobilier gratuitement avec des données officielles DVF',
  keywords: ['estimation', 'immobilier', '2A immo', 'DVF', 'prix', 'bien'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="bg-primary text-white shadow-lg">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">2A</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">ImmoEstimator</h1>
                    <p className="text-sm text-blue-200">by 2A immo</p>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm">Besoin d'aide ?</p>
                  <p className="font-semibold">{process.env.AGENCY_PHONE}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="bg-gray-800 text-white mt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4 text-secondary">2A immo</h3>
                  <p className="text-gray-400 text-sm">
                    Votre expert immobilier de confiance. 
                    Estimation gratuite et précise basée sur les données officielles.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Contact</h3>
                  <p className="text-gray-400 text-sm mb-2">
                    📞 {process.env.AGENCY_PHONE}
                  </p>
                  <p className="text-gray-400 text-sm mb-2">
                    ✉️ {process.env.AGENCY_EMAIL}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Données</h3>
                  <p className="text-gray-400 text-sm">
                    Estimations basées sur les données officielles DVF 
                    (Demandes de Valeurs Foncières) du gouvernement français.
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm">
                <p>© {new Date().getFullYear()} 2A immo - Tous droits réservés</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
