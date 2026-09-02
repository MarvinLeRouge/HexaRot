🇫🇷 Version française | [🇬🇧 English version](backend_architecture.md)

---

# Architecture backend

Le backend est une application NestJS 11. Chaque domaine est un module autonome
enregistré dans `app.module.ts`, communiquant via des interfaces typées plutôt
qu'un état mutable partagé.

## Carte des modules

```
backend/src/
├── alphabet/         # Interface VisualAlphabet + implémentation HexahueAlphabet
├── cipher/           # Pré-traitement, construction de grille, décodage
├── rotation/         # Moteur de rotation de blocs (encodage + inverse)
├── key/               # KeyCodec, encode/décode/validation base36
├── reading-order/     # Implémentations de ReadingOrderStrategy + registre
├── renderer/          # PngRenderer, SvgRenderer, palette, parseurs
├── validation/         # Validateur de paramètres par PGCD
├── shared/             # Types transverses et utilitaires de test
└── api/               # Contrôleurs NestJS + DTOs
```

## Responsabilités des modules

### `alphabet/`

Définit l'abstraction `VisualAlphabet` permettant de brancher un autre alphabet
visuel basé sur une grille, substitution caractère par caractère, à l'avenir.
`HexahueAlphabetService` est la seule implémentation en V1, associant chaque
caractère à un symbole de 2×3 cases de couleur.

### `cipher/`

La colle du pipeline central : `preprocess.ts` met le message en majuscules et le
translittère (en signalant les caractères non gérés), `build-grid.ts` dispose le
message dans une grille dimensionnée pour le bloc pivot, en la complétant par des
cases de couleur aléatoires, et `decode-grid.ts` inverse ce processus. Le
cryptogramme ne contient aucune métadonnée de longueur par conception ; voir
l'[ADR 0001](../adr/0001-no-message-length-exposure.md).

### `rotation/`

`RotationEngine` et `rotate-block.ts` implémentent la rotation de blocs
elle-même : parcours des blocs pivots selon l'ordre de lecture donné, et rotation
des cases de couleur à l'intérieur de chacun. Le même moteur pilote à la fois
l'encodage et son inverse (décodage).

### `key/`

`KeyCodec` encode et décode le format de clé base36 (préfixe `HR`) : version du
système, taille de bloc pivot, séquence et direction de rotation, et ordre de
lecture. Les clés sont indépendantes du message et réutilisables.

### `reading-order/`

`ReadingOrderStrategy` est l'interface implémentée par chacune des quatre
directions (LR-TB, RL-TB, TB-LR, BT-LR, chacune avec un mode alterné optionnel).
Le `reading-order.registry.ts` résout une stratégie à partir de son identifiant
encodé dans la clé.

### `renderer/`

`PngRenderer` (basé sur Sharp) et `SvgRenderer` transforment une grille colorée
en image de sortie ; `palette.ts` associe les couleurs logiques à des valeurs de
pixel concrètes, et les parseurs PNG/SVG font l'inverse pour le décodage.

### `validation/`

Calcule le PGCD de la taille de bloc pivot et des dimensions du symbole de
l'alphabet. Un résultat différent de 1 indique une combinaison de paramètres qui
affaiblit le cryptogramme ; l'API le remonte comme un avertissement plutôt qu'un
échec bloquant, un override explicite restant possible.

### `api/`

Contrôleurs et DTOs NestJS exposant le pipeline via HTTP. Voir
[docs/api/api_endpoints.fr.md](../api/api_endpoints.fr.md) pour la référence des
endpoints.

## Flux de données

**Encodage :** `preprocess` → `build-grid` → `RotationEngine` (sens direct) →
`PngRenderer`/`SvgRenderer`, `KeyCodec` produisant la clé à partir des paramètres
choisis.

**Décodage :** `KeyCodec` analyse la clé pour retrouver les paramètres → le
parseur PNG/SVG lit le cryptogramme en une grille → `RotationEngine` (sens
inverse) → `decode-grid` reconstruit le message, en remplissant tout padding par
un caractère `?`.

## Base de données

Trois modèles Prisma : `Alphabet` → `Symbol` → `ColorCase`. Le client Prisma est
généré dans `backend/generated/prisma` au format CommonJS (voir
l'[ADR 0003](../adr/0003-prisma-client-commonjs-output.md)). Les données de seed
pour l'alphabet Hexahue se trouvent dans `backend/prisma/seed.ts`.
