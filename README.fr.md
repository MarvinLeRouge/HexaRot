🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# 🔐 HexaRot

> *Un chiffre visuel qui combine l'encodage de symboles par couleur avec des rotations
> géométriques de blocs, pour produire des cryptogrammes faciles à générer et difficiles
> à lire — condensés dans une clé compacte et réutilisable.*

[![CI](https://github.com/MarvinLeRouge/HexaRot/actions/workflows/ci.yml/badge.svg)](https://github.com/MarvinLeRouge/HexaRot/actions)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vuedotjs&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)]()
[![License](https://img.shields.io/github/license/MarvinLeRouge/HexaRot)]()

---

## Concept

HexaRot encode n'importe quel message texte dans une grille de couleurs à l'aide de
l'alphabet visuel [Hexahue](https://www.geocachingtoolbox.com/index.php?lang=en&page=hexahue),
puis brouille cette grille en appliquant des rotations géométriques à des blocs pivots de
taille fixe — disloquant délibérément les symboles pour produire du bruit visuel.

Tous les paramètres de chiffrement (taille de bloc, séquence de rotations, ordre de lecture,
direction) sont condensés dans une clé base36 compacte préfixée `HR` — par exemple `HR1·57C3`.
La même clé déchiffre tous les messages qu'elle a servi à chiffrer.

---

## Fonctionnalités

- **Encodage** — texte → cryptogramme coloré (sortie PNG + SVG)
- **Décodage** — cryptogramme + clé → texte en clair
- **Génération et analyse de clé** — format base36 compact, copiable à la main
- **Validation des paramètres** — détection de faiblesse par PGCD, avec override possible
- **Translittération** — caractères accentués traités automatiquement (é→E, à→A, ç→C…)
- **Rendu configurable** — taille de sortie small / medium / large
- **4 ordres de lecture** — LR-TB, RL-TB, TB-LR, BT-LR, chacun avec mode alterné optionnel
- **API REST** — pipeline complet d'encodage/décodage accessible programmatiquement

---

## Démarrage rapide

**Prérequis :** Docker et Docker Compose.

```bash
git clone https://github.com/MarvinLeRouge/HexaRot.git && cd HexaRot
cp .env.example .env
docker-compose up
```

L'interface web est disponible sur `http://localhost:5173`.
L'API est disponible sur `http://localhost:3000`.

---

## API

Tous les endpoints sont préfixés par `/api`.

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/encode` | Encoder un message → cryptogramme PNG + SVG |
| `POST` | `/decode` | Décoder un cryptogramme → texte en clair |
| `POST` | `/key/generate` | Générer une clé HR depuis des paramètres |
| `GET` | `/key/parse?key=HR…` | Analyser une clé HR → paramètres structurés |

**Exemple — `POST /encode`**

```json
POST /api/encode
{
  "message": "HELLO WORLD",
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB",
  "size": "medium"
}
```

```json
{
  "png": "<PNG encodé en base64>",
  "svg": "<chaîne SVG>",
  "key": "HR1·57C3",
  "warnings": [],
  "unknownChars": []
}
```

---

## Format de la clé

> ⚠️ *Spécification d'encodage exacte en cours (FEAT-004). Les valeurs ci-dessous sont illustratives.*

Une clé HexaRot condense tous les paramètres de chiffrement dans une courte chaîne base36 :

```
HR1·57C3
│  │ └─── paramètres encodés (base36)
│  └───── séparateur
└──────── préfixe de version
```

Les paramètres condensés dans la clé, avec exemples de valeurs :

| Paramètre | Valeur exemple | Signification |
|---|---|---|
| Version | `1` | Version du système |
| Taille de bloc pivot | `5` | Blocs de 5×5 cases |
| Séquence de rotations | `[0°, 90°, 180°, 270°]` | Une des 24 permutations possibles |
| Direction de rotation | `cw` | Sens horaire |
| Ordre de lecture | `LR-TB` | Gauche-droite, haut-bas |

La clé est **indépendante du message** — la même clé chiffre et déchiffre autant de messages
que souhaité. La longueur du message est stockée dans l'en-tête du cryptogramme, pas dans
la clé.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | NestJS 11 + TypeScript (strict) |
| Base de données | PostgreSQL + Prisma |
| Rendu d'images | Sharp (PNG) + SVG natif |
| Frontend | Vue.js 3 + TypeScript + vue-i18n |
| DevOps | Docker Compose, GitHub Actions |
| Tests | Jest (backend), Vitest (frontend) |

---

## Architecture

```
backend/
├── alphabet/        # Interface VisualAlphabet + implémentation HexahueAlphabet
├── cipher/          # Pré-traitement, construction de grille, en-tête de métadonnées
├── rotation/        # Moteur de rotation de blocs (encodage + inverse)
├── key/             # KeyCodec — encode/décode/valide en base36
├── reading-order/   # Implémentations de ReadingOrderStrategy
├── renderer/        # PngRenderer, SvgRenderer
├── validation/      # Validateur de paramètres par PGCD
└── api/             # Contrôleurs NestJS + DTOs

frontend/
├── views/           # Encodage, Décodage, Clé
├── stores/          # Stores Pinia
└── i18n/            # Anglais (V1), Français (V2)
```

---

## Roadmap

### V1

- ✅ Infra (NestJS, Vue.js, Docker Compose, Prisma)
- 🔄 CI (GitHub Actions — pipeline de tests, synchronisation du backlog)
- ⬜ Alphabet (interface VisualAlphabet + implémentation Hexahue)
- ⬜ Cipher (pré-traitement, construction de grille, en-tête de métadonnées)
- ⬜ Moteur de rotation
- ⬜ Codec de clé (encodage / décodage / validation base36)
- ⬜ Stratégies d'ordre de lecture (4 directions + mode alterné)
- ⬜ Renderers (PNG + SVG)
- ⬜ Endpoints API (encode, decode, key)
- ⬜ Frontend (vue encodage, vue décodage, vue clé)
- ⬜ Tests & couverture

### V2

- ⬜ Interface française (i18n)
- ⬜ Mode de décodage animé
- ⬜ Ordre de lecture en spirale
- ⬜ Score de corrélation
- ⬜ Authentification utilisateur

---

## À propos

Projet personnel à double vocation :

- **Apprentissage** — TypeScript strict, architecture NestJS (modules, injection de
  dépendances, pipes), Prisma + PostgreSQL, Vue.js 3 Composition API, rendu d'images avec
  Sharp, encodage base36, algorithmes de rotation de matrices 2D, CI/CD GitHub Actions
- **Portfolio** — démontre une approche structurée sur un domaine algorithmique non trivial,
  du design du chiffre jusqu'à la livraison full-stack testée et documentée

---

## Licence

Ce projet est sous licence MIT — voir le fichier [LICENSE](LICENSE) pour plus de détails.
