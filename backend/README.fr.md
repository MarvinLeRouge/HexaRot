🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# Backend HexaRot

API NestJS 11 implémentant le chiffre visuel HexaRot : pré-traitement du message,
construction de la grille, rotation des blocs, encodage/décodage de la clé, et rendu
PNG/SVG.

Voir le [README racine](../README.fr.md) pour la vue d'ensemble du projet et le
[guide d'architecture backend](../docs/architecture/backend_architecture.fr.md) pour
le détail des modules.

---

## Prérequis

- Node.js et npm
- PostgreSQL 16 (via le `docker-compose.yml` racine, ou une instance locale)

Le lancement via Docker Compose depuis la racine du dépôt est la configuration
recommandée ; voir la section Démarrage rapide du README racine.

---

## Installation

```bash
npm install
npx prisma migrate dev     # applique les migrations et régénère le client Prisma
npx prisma db seed         # peuple les données de l'alphabet Hexahue
```

Le client Prisma est généré dans `generated/prisma` (pas l'emplacement par défaut
dans `node_modules`), au format CommonJS.

---

## Développement

```bash
npm run start:dev          # serveur de dev avec watch
npm run build               # build de production
npm run lint                 # ESLint avec correction automatique
npm run format              # Prettier
```

## Tests

```bash
npm run test                # tests unitaires Jest
npm run test:watch          # mode watch Jest
npm run test:cov            # rapport de couverture
npm run test:e2e            # tests de bout en bout (nécessite une instance PostgreSQL accessible)
```

Lancer un seul fichier de test :

```bash
npx jest path/to/file.spec.ts
```

---

## Organisation des modules

```
src/
├── alphabet/        # Interface VisualAlphabet + implémentation HexahueAlphabet
├── cipher/          # Pré-traitement (majuscules, translittération), construction de grille
├── rotation/        # Moteur de rotation de blocs (encodage + inverse)
├── key/             # KeyCodec, encode/décode/validation base36
├── reading-order/   # Implémentations de ReadingOrderStrategy
├── renderer/        # PngRenderer (Sharp), SvgRenderer
├── validation/       # Validateur de paramètres par PGCD
├── shared/           # Types et utilitaires de test partagés
└── api/             # Contrôleurs NestJS + DTOs
```

Chaque domaine est un module NestJS autonome enregistré dans `app.module.ts`. Toutes
les routes API sont préfixées par `/api` ; voir la
[référence API](../docs/api/api_endpoints.fr.md) pour le détail des endpoints.

---

## Base de données

Trois modèles Prisma : `Alphabet` → `Symbol` → `ColorCase`. Les données de seed pour
l'alphabet Hexahue se trouvent dans `prisma/seed.ts`.

```bash
npx prisma studio           # parcourir la base de données
```
