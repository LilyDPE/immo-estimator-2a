import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting DVF import...')

    // Liste des départements à importer
    const departments = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '21',
      '22', '23', '24', '25', '26', '27', '28', '29', '2A', '2B',
      '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
      '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
      '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
      '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
      '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
      '80', '81', '82', '83', '84', '85', '86', '87', '88', '89',
      '90', '91', '92', '93', '94', '95'
    ]

    const year = '2024'
    let totalImported = 0

    for (const dept of departments) {
      try {
        const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/departements/${dept}.csv`
        console.log(`📥 Fetching ${dept}...`)

        const response = await fetch(url)
        if (!response.ok) {
          console.log(`⚠️  No data for ${dept}`)
          continue
        }

        const text = await response.text()
        const lines = text.split('\n')
        const headers = lines[0].split('|')

        console.log(`📊 Processing ${lines.length} lines for ${dept}`)

        const batch = []
        const batchSize = 100

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue

          const values = lines[i].split('|')
          const row: any = {}

          headers.forEach((header, idx) => {
            row[header.trim()] = values[idx]?.trim() || null
          })

          // Filtrer les données pertinentes
          if (!row.valeur_fonciere || parseFloat(row.valeur_fonciere) === 0) continue
          if (!['Maison', 'Appartement'].includes(row.type_local)) continue
          if (!row.surface_reelle_bati || parseFloat(row.surface_reelle_bati) === 0) continue

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
          }

          batch.push(record)

          if (batch.length >= batchSize) {
            const { error } = await supabaseClient
              .from('ventes_dvf')
              .upsert(batch, { onConflict: 'id' })

            if (error) {
              console.error(`❌ Insert error for ${dept}:`, error)
            } else {
              totalImported += batch.length
              console.log(`✅ Inserted ${batch.length} records (total: ${totalImported})`)
            }

            batch.length = 0
          }
        }

        // Insert remaining
        if (batch.length > 0) {
          const { error } = await supabaseClient
            .from('ventes_dvf')
            .upsert(batch, { onConflict: 'id' })

          if (!error) {
            totalImported += batch.length
            console.log(`✅ Final batch: ${batch.length} records (total: ${totalImported})`)
          }
        }

        console.log(`✅ Completed ${dept}`)

      } catch (error) {
        console.error(`❌ Error processing ${dept}:`, error)
      }
    }

    console.log(`🎉 Import completed! Total: ${totalImported} records`)

    return new Response(
      JSON.stringify({ success: true, imported: totalImported }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Import failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
