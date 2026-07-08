# Tijara — Gestion commerciale Maroc

Application de gestion commerciale 100% marocaine en un seul fichier HTML :
devis, factures (ICE, TVA, montant en lettres), avoirs, BL, bons de commande,
achats, caisse (POS), stock multi-dépôts, trésorerie, TVA, rapports…

## ⚠️ Important : où sont les données ?
Les données sont stockées **dans le navigateur de chaque utilisateur**
(localStorage), pas sur le serveur. Chaque appareil/navigateur a ses propres
données. Utilisez **Paramètres → Exporter la sauvegarde (JSON)** régulièrement,
et pour passer d'un appareil à l'autre, exportez puis importez.
Un changement de domaine (ex. Pages → Railway) repart de zéro : importez votre JSON.

Activez aussi **Paramètres → Accès protégé** avant de publier l'URL.

## 1) Déployer sur GitHub Pages (gratuit)
1. Créez un dépôt sur https://github.com/new (ex. `tijara`), public ou privé*.
2. Envoyez les fichiers :
   ```bash
   git init
   git add .
   git commit -m "Tijara v1"
   git branch -M main
   git remote add origin https://github.com/VOTRE_COMPTE/tijara.git
   git push -u origin main
   ```
   (ou glissez-déposez les fichiers via « Add file → Upload files » sur github.com)
3. Dans le dépôt : **Settings → Pages → Source : Deploy from a branch →
   Branch : main / (root) → Save**.
4. Votre application est en ligne sous ~1 min :
   `https://VOTRE_COMPTE.github.io/tijara/`

\* Pages sur dépôt privé nécessite un compte GitHub Pro ; en compte gratuit,
le dépôt doit être public (le code, pas vos données, qui restent locales).

## 2) Déployer sur Railway
1. Poussez d'abord le dépôt sur GitHub (étape 1).
2. Sur https://railway.app : **New Project → Deploy from GitHub repo** →
   choisissez `tijara`. Railway détecte Node et lance `npm start`
   (le serveur écoute automatiquement sur `process.env.PORT`).
3. Une fois déployé : **Settings → Networking → Generate Domain** →
   vous obtenez `https://tijara-production-xxxx.up.railway.app`.
4. Chaque `git push` sur `main` redéploie automatiquement.

## Lancer en local
```bash
node server.js
# puis ouvrir http://localhost:3000
```
