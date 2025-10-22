const https = require('https');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// URLs des fichiers DVF (dernières années)
const DVF_URLS = [
  'https://files.data.gouv.fr/geo-dvf/latest/csv/2024/full.csv.gz',
  'https://files.data.gouv.fr/geo-dvf/latest/csv/2023/full.csv.gz',
  'https://files.data.gouv.fr/geo-dvf/latest/csv/2022/full.csv.gz',
];

async function downloadAndImport() {
  console.log('🚀 Starting DVF import...');
  
  try {
    // Pour l'instant, on va utiliser l'API data.gouv.fr directement
    // car les fichiers CSV sont trop gros pour GitHub Actions (timeouts)
    
    console.log('📊 Fetching DVF data for Seine-Maritime (76)...');
    
    // On utilise l'API de data.gouv.fr pour récupérer les données
    const departments = ['76']; // Seine-Maritime
    const years = ['2024', '2023', '2022'];
    
    for (const dept of departments) {
      for (const year of years) {
        console.log(`📥 Processing ${dept} - ${year}...`);
        
        const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/departements/${dept}.csv`;
        
        await new Promise((resolve, reject) => {
          https.get(url, async (res) => {
            if (res.statusCode === 404) {
              console.log(`⚠️  No data for ${dept} - ${year}`);
              resolve();
              return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
              console.log(`✅ Downloaded ${data.length} bytes`);
              await processCSV(data);
              resolve();
            });
            res.on('error', reject);
          });
        });
      }
    }
    
    console.log('✅ Import completed!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

async function processCSV(csvData) {
  const lines = csvData.split('\n');
  const headers = lines[0].split('|');
  
  console.log(`📋 Processing ${lines.length} lines...`);
  
  const batch = [];
  const batchSize = 100;
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split('|');
    const row = {};
    
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || null;
    });
    
    // Filtrer les données pertinentes
    if (!row.valeur_fonciere || row.valeur_fonciere === '0') continue;
    if (!row.type_local || !['Maison', 'Appartement'].includes(row.type_local)) continue;
    if (!row.surface_reelle_bati || row.surface_reelle_bati === '0') continue;
    
    const record = {
      id: row.id_mutation || `${row.date_mutation}_${i}`,
      date_mutation: row.date_mutation,
      nature_mutation: row.nature_mutation,
      valeur_fonciere: parseFloat(row.valeur_fonciere),
      adresse_numero: row.adresse_numero,
      adresse_nom_voie: row.adresse_nom_voie,
      code_postal: row.code_postal,
      nom_commune: row.nom_commune,
      code_commune: row.code_commune,
      code_departement: row.code_departement,
      type_local: row.type_local,
      surface_reelle_bati: parseFloat(row.surface_reelle_bati),
      nombre_pieces_principales: parseInt(row.nombre_pieces_principales) || null,
      latitude: parseFloat(row.latitude) || null,
      longitude: parseFloat(row.longitude) || null,
    };
    
    batch.push(record);
    
    if (batch.length >= batchSize) {
      await insertBatch(batch);
      batch.length = 0;
    }
  }
  
  if (batch.length > 0) {
    await insertBatch(batch);
  }
}

async function insertBatch(records) {
  const { data, error } = await supabase
    .from('ventes_dvf')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Insert error:', error);
  } else {
    console.log(`✅ Inserted ${records.length} records`);
  }
}

downloadAndImport();
