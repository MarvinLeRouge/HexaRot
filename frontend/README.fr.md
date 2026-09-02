🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# Frontend HexaRot

Application monopage Vue 3 + TypeScript pour le chiffre visuel HexaRot : vues
Encode, Decode et Key, adossées à l'[API backend](../backend/README.fr.md).

Voir le [README racine](../README.fr.md) pour la vue d'ensemble du projet et le
[guide d'architecture frontend](../docs/architecture/frontend_architecture.fr.md)
pour le détail de la structure.

---

## Prérequis

- Node.js et npm

Le lancement via Docker Compose depuis la racine du dépôt est la configuration
recommandée ; voir la section Démarrage rapide du README racine.

---

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev                 # serveur de dev Vite
npm run build                # vérification des types (vue-tsc) + build de production
npm run preview              # prévisualiser le build de production en local
npm run lint                 # ESLint
```

## Tests

```bash
npm run test                 # Vitest
npm run test:cov            # rapport de couverture
```

---

## Structure

```
src/
├── views/           # EncodeView, DecodeView, KeyView
├── stores/           # Stores Pinia (encode, decode, key)
├── components/       # Composants UI partagés
├── layouts/          # Structures de mise en page
├── api/              # Client de l'API backend
├── constants/        # Constantes partagées (ordres de lecture, tailles, etc.)
├── locales/           # Fichiers de traduction vue-i18n
├── router/            # Configuration de Vue Router
└── utils/             # Fonctions utilitaires partagées
```

## Internationalisation

Le frontend utilise `vue-i18n`. Seule la locale anglaise (`locales/en.json`) est
implémentée ; une locale française est prévue pour une version ultérieure (voir
[docs/roadmap.fr.md](../docs/roadmap.fr.md)).
