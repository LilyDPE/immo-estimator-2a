# 🚀 Setup Import DVF Automatique

## Prérequis
- Compte Supabase créé ✅
- Supabase CLI installé

## Étape 1 : Installer Supabase CLI

Sur Mac :
```bash
brew install supabase/tap/supabase
```

## Étape 2 : Login Supabase
```bash
supabase login
```

## Étape 3 : Lier le projet
```bash
supabase link --project-ref zvmpvzixzfrhynzpuqmb
```

## Étape 4 : Déployer l'Edge Function
```bash
supabase functions deploy import-dvf --no-verify-jwt
```

## Étape 5 : Tester l'import
```bash
curl -X POST \
  -H "Authorization: Bearer [VOTRE_SERVICE_KEY]" \
  "https://zvmpvzixzfrhynzpuqmb.supabase.co/functions/v1/import-dvf"
```

## Étape 6 : Vérifier les données

Allez dans Supabase → Table Editor → ventes_dvf

Vous devriez voir des milliers de lignes !

## Automatisation

La GitHub Action se déclenchera automatiquement :
- 1er avril à 2h du matin
- 1er octobre à 2h du matin

Ou manuellement via GitHub Actions → Import DVF Data → Run workflow

---

## ⏱️ Temps d'exécution estimé

- France entière : ~30-45 minutes
- ~500 000 ventes sur 3 ans
