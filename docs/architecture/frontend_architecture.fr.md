🇫🇷 Version française | [🇬🇧 English version](frontend_architecture.md)

---

# Architecture frontend

Le frontend est une application monopage Vue 3 utilisant la Composition API,
Pinia pour l'état, Vue Router pour la navigation, et vue-i18n pour les
traductions.

## Structure

```
frontend/src/
├── views/            # EncodeView, DecodeView, KeyView
├── components/        # Composants UI partagés, spécifiques aux vues
├── layouts/            # AppLayout (structure de page)
├── stores/             # Stores Pinia : encode, decode, key
├── api/                # Client de l'API backend
├── constants/           # Constantes partagées (ex. reading-orders.ts)
├── locales/             # Fichiers de traduction vue-i18n (en.json)
├── router/               # Configuration de Vue Router
└── utils/                # Fonctions utilitaires partagées
```

## Routage

Trois routes de premier niveau, définies dans `router/`, chacune associée à une
vue :

| Chemin | Vue | Rôle |
|---|---|---|
| `/` | redirige vers `/encode` | |
| `/encode` | `EncodeView` | Texte → cryptogramme |
| `/decode` | `DecodeView` | Cryptogramme → texte |
| `/key` | `KeyView` | Générer ou analyser une clé |

## Vues et composants

Chaque vue compose un formulaire de paramètres, une action de soumission vers son
store, et un panneau de résultat :

- `EncodeView` utilise `EncodeParamsForm`, `RotationSequencePicker`, et
  `EncodeResultPanel`.
- `DecodeView` utilise `DecodeUploadArea` et `DecodeParamsForm`.
- `KeyView` utilise `KeyGeneratorForm` et `KeyParserForm`.

`LoadingSpinner` est partagé entre les trois pour les requêtes en cours.
`AppLayout` fournit la structure de page commune (navigation, largeur du
conteneur).

## Gestion de l'état

Chaque vue a un store Pinia dédié (`stores/encode.ts`, `stores/decode.ts`,
`stores/key.ts`) qui conserve les paramètres du formulaire, le dernier résultat
réussi, l'état de chargement, et l'état d'erreur. Les stores ont la
responsabilité de suivre si un résultat affiché est périmé par rapport aux
paramètres courants du formulaire, plutôt que de purement supprimer le résultat
précédent ; voir l'[ADR 0005](../adr/0005-stale-result-marked-not-destroyed.md).

## Client API

`api/client.ts` centralise les appels vers les endpoints `/api` du backend (voir
[docs/api/api_endpoints.fr.md](../api/api_endpoints.fr.md)). Les requêtes passent
par le proxy du serveur de dev Vite vers le conteneur backend en développement
local (voir [docs/operations.fr.md](../operations.fr.md)).

## Internationalisation

`vue-i18n` est en place, avec `locales/en.json` comme seule locale implémentée en
V1. Une locale française est prévue pour la V2 ; voir [docs/roadmap.fr.md](../roadmap.fr.md).

## Ajouter une vue

1. Créer le composant de vue sous `views/`, et un store Pinia correspondant sous
   `stores/` s'il nécessite son propre état.
2. Enregistrer la route dans `router/`.
3. Ajouter tout nouveau texte d'interface à `locales/en.json`.
4. Ajouter un fichier de test `.spec.ts` à côté de la vue, en suivant la
   structure de test des vues existantes.
