# 🚀 Guide complet de déploiement — Tijara Gestion Commerciale
### GitHub Pages + Railway · pas à pas, du compte à la mise en ligne

---

## Sommaire
1. [Avant de commencer — l'essentiel à comprendre](#1-avant-de-commencer)
2. [Prérequis](#2-prérequis)
3. [Déployer sur GitHub — Méthode A : sans ligne de commande (recommandée débutants)](#3-méthode-a)
4. [Déployer sur GitHub — Méthode B : avec Git en ligne de commande](#4-méthode-b)
5. [Activer GitHub Pages (mise en ligne gratuite)](#5-github-pages)
6. [Déployer sur Railway](#6-railway)
7. [Mettre à jour l'application (nouvelles versions)](#7-mises-à-jour)
8. [Sécurité et gestion des données](#8-sécurité)
9. [Domaine personnalisé (optionnel)](#9-domaine)
10. [Dépannage — erreurs courantes](#10-dépannage)
11. [Checklist finale](#11-checklist)

---

## 1. Avant de commencer — l'essentiel à comprendre <a name="1-avant-de-commencer"></a>

**Tijara est une application « 100 % locale »** : le serveur (GitHub Pages ou
Railway) ne fait que **livrer la page** au navigateur. Toutes vos données
(clients, factures, stock, paie…) sont stockées **dans le navigateur de chaque
utilisateur** (localStorage), jamais sur le serveur.

Conséquences pratiques :

| Situation | Conséquence |
|---|---|
| 2 personnes ouvrent la même URL | Chacune a **ses propres données**, indépendantes |
| Vous changez d'URL (Pages → Railway) | Nouveau domaine = **données vides** → importez votre sauvegarde JSON |
| Vous videz le cache / « effacer les données de site » | Données perdues → restaurez le JSON |
| Le code du dépôt GitHub est public | **Seul le logiciel** est public, jamais vos données |

> 🔑 **Règle d'or** : Paramètres → **Exporter la sauvegarde (JSON)** chaque
> semaine (et avant toute manipulation). Ce fichier JSON est votre coffre-fort.

---

## 2. Prérequis <a name="2-prérequis"></a>

- Le pack `tijara-deploiement.zip`, **décompressé**. Il contient :
  - `index.html` — l'application complète
  - `server.js` — mini-serveur Node pour Railway (aucune dépendance)
  - `package.json` — indique à Railway comment démarrer
  - `README.md` et `.gitignore`
- Un **compte GitHub** (gratuit) : https://github.com/signup
- Pour Railway : un **compte Railway** : https://railway.app (connexion
  possible directement avec votre compte GitHub — recommandé).
- Un navigateur récent. C'est tout.

---

## 3. Méthode A — GitHub sans ligne de commande (interface web) <a name="3-méthode-a"></a>

**Idéale si vous n'avez jamais utilisé Git.** Durée : 5 minutes.

### Étape 1 — Créer le dépôt
1. Connectez-vous sur https://github.com puis ouvrez https://github.com/new
2. **Repository name** : `tijara` (ou le nom de votre choix, sans espaces)
3. Visibilité : **Public**
   > GitHub Pages est gratuit uniquement sur dépôt public (compte gratuit).
   > Rappel : c'est le code qui est public, pas vos données.
4. Ne cochez rien d'autre → bouton vert **Create repository**.

### Étape 2 — Envoyer les fichiers
1. Sur la page du dépôt vide, cliquez **« uploading an existing file »**
   (ou plus tard : bouton **Add file → Upload files**).
2. **Glissez-déposez les 5 fichiers** du pack décompressé
   (`index.html`, `server.js`, `package.json`, `README.md`, `.gitignore`).
   ⚠️ Glissez les *fichiers*, pas le dossier qui les contient : `index.html`
   doit être **à la racine** du dépôt.
3. En bas, message de commit : `Première version` → **Commit changes**.

### Étape 3 — Vérifier
La page du dépôt doit lister `index.html` à la racine. ✅
Passez à la [section 5](#5-github-pages) pour la mise en ligne.

---

## 4. Méthode B — GitHub avec Git en ligne de commande <a name="4-méthode-b"></a>

**Pour les utilisateurs à l'aise avec un terminal.** Permet des mises à jour
en 3 commandes.

### Étape 1 — Installer et configurer Git (une seule fois)
- Windows : https://git-scm.com/download/win (installez avec les options par défaut)
- Vérifiez : `git --version`
- Configurez votre identité :
```bash
git config --global user.name "Votre Nom"
git config --global user.email "vous@exemple.ma"
```

### Étape 2 — Créer le dépôt sur GitHub
Comme en méthode A, étape 1 (créez `tijara`, **vide**, sans README).

### Étape 3 — Pousser les fichiers
Ouvrez un terminal **dans le dossier décompressé** du pack, puis :
```bash
git init
git add .
git commit -m "Tijara v1 - gestion commerciale + paie 2026"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/tijara.git
git push -u origin main
```

> 🔐 **Authentification** : GitHub n'accepte plus les mots de passe pour le
> push HTTPS. À la demande d'identifiants, utilisez un **Personal Access
> Token** : github.com → votre avatar → *Settings → Developer settings →
> Personal access tokens → Tokens (classic) → Generate new token* → cochez
> `repo` → copiez le token et collez-le **à la place du mot de passe**.
> Alternative simple : installez **GitHub Desktop** (https://desktop.github.com),
> qui gère la connexion pour vous.

---

## 5. Activer GitHub Pages — mise en ligne gratuite <a name="5-github-pages"></a>

1. Sur la page du dépôt → onglet **Settings** (roue dentée).
2. Menu de gauche → **Pages**.
3. Section **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` — dossier : `/ (root)` → **Save**
4. Patientez **1 à 2 minutes**, rechargez la page Settings → Pages :
   un bandeau affiche *« Your site is live at… »*

🎉 Votre application est en ligne :
```
https://VOTRE_COMPTE.github.io/tijara/
```

**Premiers gestes sur l'URL en ligne :**
1. Ouvrez l'URL → l'application démarre vide (normal : nouveau domaine).
2. **Paramètres → Importer une sauvegarde** → sélectionnez votre JSON.
3. **Paramètres → Accès protégé** → activez le verrouillage et définissez
   les mots de passe administrateur (et vendeur si besoin).

---

## 6. Déployer sur Railway <a name="6-railway"></a>

Railway exécute le petit serveur Node du pack et vous donne une URL en
`*.up.railway.app`. Le dépôt GitHub (sections 3-5) doit exister au préalable.

### Étape 1 — Créer le projet
1. https://railway.app → **Login** → *Login with GitHub* (autorisez Railway).
2. **New Project** → **Deploy from GitHub repo**.
3. Si demandé, cliquez **Configure GitHub App** et donnez accès au dépôt
   `tijara` (ou à tous vos dépôts).
4. Sélectionnez **tijara** → le déploiement démarre automatiquement.

### Étape 2 — Ce que Railway fait tout seul
- Détecte `package.json` → environnement **Node.js** ;
- Lance `npm start` → notre `server.js` ;
- Le serveur écoute sur le port fourni par Railway (`process.env.PORT`) —
  **aucune variable à configurer**.

Suivez la progression dans l'onglet **Deployments** ; attendez le statut
**Success** (≈ 1 minute).

### Étape 3 — Obtenir l'URL publique
1. Cliquez sur le service (la carte `tijara`) → onglet **Settings**.
2. Section **Networking** (ou *Public Networking*) → **Generate Domain**.
3. Railway crée : `https://tijara-production-xxxx.up.railway.app`
4. Ouvrez l'URL → importez votre JSON, activez le verrouillage (comme en §5).

### Étape 4 — Coûts (à connaître)
Railway est un service **payant à l'usage** avec un essai gratuit limité ;
le plan de base (Hobby) coûte environ **5 $/mois** incluant un crédit
d'usage — largement suffisant pour ce mini-serveur statique. Les tarifs
évoluant, vérifiez https://railway.com/pricing. **Si vous voulez du 100 %
gratuit : GitHub Pages suffit** — Railway est utile si vous préférez son
domaine, ses logs, ou prévoyez d'ajouter plus tard une base de données.

---

## 7. Mettre à jour l'application <a name="7-mises-à-jour"></a>

Quand vous recevez une nouvelle version de `index.html` (nouveau module,
correction…) :

**⚠️ Avant tout : exportez votre sauvegarde JSON** (vos données ne sont pas
dans le fichier, mais c'est le réflexe de sécurité).

### Via l'interface web GitHub
1. Dépôt → cliquez sur `index.html` → icône **crayon… non** : plus simple,
   **Add file → Upload files** → glissez le **nouveau** `index.html`
   (même nom = remplacement) → **Commit changes**.
2. GitHub Pages se republie sous 1-2 min ; **Railway redéploie
   automatiquement** dès qu'il voit le nouveau commit. Rien d'autre à faire.

### Via Git
```bash
# copiez le nouveau index.html dans le dossier, puis :
git add index.html
git commit -m "Mise à jour Tijara"
git push
```

### Côté navigateur
Si l'ancienne version s'affiche encore : rechargez avec **Ctrl+F5**
(vider le cache). Vos données localStorage ne sont **pas** affectées par
les mises à jour.

---

## 8. Sécurité et gestion des données <a name="8-sécurité"></a>

- **Activez le verrouillage** (Paramètres → Accès protégé) dès que l'URL
  est en ligne : n'importe qui connaissant l'adresse peut ouvrir
  l'application (il verrait une application vide, mais autant verrouiller).
  Cette protection est dissuasive, pas un chiffrement.
- **Exportez le JSON régulièrement** et conservez-le hors du navigateur
  (Drive, clé USB, email à vous-même).
- **Passer d'un appareil à l'autre** : Export JSON sur l'appareil A →
  Import sur l'appareil B. C'est aussi la procédure PC ↔ mobile.
- **HTTPS** : GitHub Pages et Railway le fournissent automatiquement. ✅
- Ne mettez **jamais** votre fichier de sauvegarde JSON dans le dépôt
  GitHub public.

---

## 9. Domaine personnalisé (optionnel) <a name="9-domaine"></a>

Vous possédez `gestion.masociete.ma` ?

- **GitHub Pages** : Settings → Pages → *Custom domain* → saisissez le
  domaine ; chez votre registrar, créez un **CNAME** pointant vers
  `VOTRE_COMPTE.github.io`. Cochez *Enforce HTTPS* une fois validé.
- **Railway** : Settings → Networking → **Custom Domain** → saisissez le
  domaine → créez le **CNAME** indiqué par Railway chez votre registrar.

⚠️ Changer de domaine = nouveau localStorage : refaites un Export/Import JSON.

---

## 10. Dépannage — erreurs courantes <a name="10-dépannage"></a>

| Symptôme | Cause probable | Solution |
|---|---|---|
| GitHub Pages : **404** | `index.html` pas à la racine, ou Pages non activé | Vérifiez que `index.html` est à la racine du dépôt ; Settings → Pages → branche `main` / root |
| Pages : « site is live » mais page blanche | Cache navigateur | Ctrl+F5 ; testez en navigation privée |
| Push refusé : `authentication failed` | Mot de passe utilisé au lieu du token | Créez un Personal Access Token (§4) ou utilisez GitHub Desktop |
| Railway : build **Failed** | `package.json` absent ou mal placé | Les 5 fichiers doivent être à la racine du dépôt |
| Railway : **Application failed to respond** | Port codé en dur | Notre `server.js` utilise `process.env.PORT` — vérifiez que c'est bien le fichier du pack, non modifié |
| Railway : pas d'URL | Domaine non généré | Settings → Networking → **Generate Domain** |
| « Mes factures ont disparu ! » | Nouvelle URL, autre navigateur, ou données de site effacées | Importez votre dernière sauvegarde JSON (Paramètres) |
| L'app en ligne est une vieille version | Cache | Ctrl+F5 ; vérifiez la date du dernier commit sur GitHub |
| Impression : URL/date en marge | Réglage navigateur | Fenêtre d'impression → décochez « En-têtes et pieds de page » |

---

## 11. Checklist finale <a name="11-checklist"></a>

- [ ] Compte GitHub créé, dépôt `tijara` créé
- [ ] Les 5 fichiers du pack **à la racine** du dépôt
- [ ] GitHub Pages activé (main / root) → URL `github.io` testée
- [ ] Railway connecté au dépôt → **Generate Domain** → URL testée
- [ ] Sauvegarde JSON **importée** sur la ou les URL utilisées
- [ ] **Verrouillage activé** (mot de passe admin ± vendeur)
- [ ] Sauvegarde JSON exportée et rangée en lieu sûr
- [ ] Procédure de mise à jour comprise (remplacer `index.html` → push)

**Vos deux adresses finales :**
```
GitHub Pages : https://VOTRE_COMPTE.github.io/tijara/
Railway      : https://tijara-production-xxxx.up.railway.app
```

Bon déploiement ! 🇲🇦
