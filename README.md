# 🏠 ImmoEstimator - Application d'estimation immobilière pour 2A immo

Application web d'estimation immobilière gratuite basée sur les **données officielles DVF** (Demandes de Valeurs Foncières) en temps réel.

## ✨ Fonctionnalités

- ✅ **Estimation gratuite** en moins de 30 secondes
- ✅ **Données DVF en temps réel** via API gouvernementale
- ✅ **Algorithme intelligent** avec ajustements (DPE, étage, parking, etc.)
- ✅ **Interface moderne** aux couleurs de 2A immo
- ✅ **Architecture 100% cloud** - Rien en local
- ✅ **Cache intelligent** pour les performances
- ✅ **Responsive** - Fonctionne sur mobile, tablette et desktop

## 🏗️ Architecture

### Stack technique
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Données**: API DVF data.gouv.fr (temps réel)
- **Déploiement**: Vercel (gratuit)
- **Cache**: Node-cache (24h TTL)

### Pourquoi cette architecture ?
✅ **Zéro installation locale** - Tout est en cloud  
✅ **Toujours à jour** - Données DVF en temps réel  
✅ **Gratuit** - Vercel gratuit + API publique  
✅ **Scalable** - Gère automatiquement le trafic  
✅ **Rapide** - Cache intelligent + edge network  

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte GitHub ✅
- Compte Vercel (gratuit)

### Étapes

1. **Connecter Vercel à GitHub**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez "Sign Up" avec GitHub
   - Autorisez Vercel

2. **Importer le projet**
   - Cliquez "Add New..." > "Project"
   - Sélectionnez votre repository `immo-estimator-2a`
   - Cliquez "Import"

3. **Configurer les variables d'environnement**
   
   Ajoutez ces variables dans Vercel:
