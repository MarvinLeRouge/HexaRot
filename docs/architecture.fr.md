🇫🇷 Version française | [🇬🇧 English version](architecture.md)

---

# Architecture - HexaRot

> Référence technique publique. Voir [architecture backend](architecture/backend_architecture.fr.md) et [architecture frontend](architecture/frontend_architecture.fr.md) pour les détails d'implémentation.

## Vue d'ensemble

HexaRot est une application web à deux composants :

- **Backend** - NestJS 11. Chaque domaine (alphabet, cipher, rotation, key, reading-order, renderer, validation) est un module autonome, assemblés pour encoder un texte en grille de couleurs Hexahue, la brouiller via des rotations de blocs, puis la décoder. PostgreSQL via Prisma stocke les données alphabet/symbole.
- **Frontend** - SPA Vue 3 (Composition API) avec Pinia, Vue Router et vue-i18n. Trois vues (Encode, Decode, Key) pilotent le pipeline via l'API REST du backend.

## Structure du projet

```
hexarot/
├── backend/
│   └── src/
│       ├── alphabet/        # Interface VisualAlphabet + HexahueAlphabet
│       ├── cipher/          # Pré-traitement, construction/décodage de la grille
│       ├── rotation/        # Moteur de rotation de blocs (encode + inverse)
│       ├── key/             # KeyCodec, encode/decode/validate base36
│       ├── reading-order/   # Implémentations ReadingOrderStrategy
│       ├── renderer/        # PngRenderer, SvgRenderer
│       ├── validation/      # Validateur de paramètres basé sur le PGCD
│       └── api/             # Contrôleurs NestJS + DTOs
├── frontend/
│   └── src/
│       ├── views/       # EncodeView, DecodeView, KeyView
│       ├── stores/      # Stores Pinia (encode, decode, key)
│       ├── components/  # UI partagée et spécifique aux vues
│       └── api/         # Client API du backend
└── docs/
    ├── architecture/    # architecture backend/frontend
    ├── adr/             # architecture decision records
    ├── api/             # référence API
    └── guides/          # guides développeur/utilisateur
```

## Pour aller plus loin

- [Architecture backend](architecture/backend_architecture.fr.md)
- [Architecture frontend](architecture/frontend_architecture.fr.md)
- [Référence API](api/api_endpoints.fr.md)
- [Registre des décisions d'architecture](adr/README.md)
- [Guides développeur](guides/)
- [Contexte produit](product-context.fr.md)
- [Opérations](operations.fr.md)
- [Design system](design-system.fr.md)
