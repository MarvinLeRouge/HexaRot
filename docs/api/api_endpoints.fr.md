🇫🇷 Version française | [🇬🇧 English version](api_endpoints.md)

---

# Référence API

Tous les endpoints sont préfixés par `/api`. Voir le
[guide d'architecture backend](../architecture/backend_architecture.fr.md) pour
la correspondance entre chaque endpoint et le pipeline sous-jacent.

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/encode` | Encoder un message → cryptogramme PNG + SVG |
| `POST` | `/decode` | Décoder un cryptogramme → texte en clair |
| `POST` | `/key/generate` | Générer une clé HR depuis des paramètres |
| `POST` | `/key/parse` | Analyser une clé HR → paramètres structurés |

## `POST /encode`

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

## `POST /decode`

```json
POST /api/decode
{
  "cryptogram": "<PNG encodé en base64 ou chaîne SVG brute>",
  "format": "png",
  "key": "HR1·57C3",
  "size": "medium"
}
```

```json
{
  "message": "HELLO WORLD"
}
```

## `POST /key/generate`

```json
POST /api/key/generate
{
  "pivotBlockSize": 5,
  "rotationSequence": [0, 1, 2, 3],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

```json
{
  "key": "HR1·57C3"
}
```

## `POST /key/parse`

```json
POST /api/key/parse
{
  "key": "HR1·57C3"
}
```

```json
{
  "pivotBlockSize": 5,
  "rotationSequence": [0, 90, 180, 270],
  "rotationDirection": "cw",
  "readingOrder": "LR-TB"
}
```

## Format de la clé

Une clé HexaRot condense tous les paramètres de chiffrement dans une courte
chaîne base36 :

```
HR1·57C3
│  │ └─── paramètres encodés (base36)
│  └───── séparateur
└──────── préfixe de version
```

| Paramètre | Valeur exemple | Signification |
|---|---|---|
| Version | `1` | Version du système |
| Taille de bloc pivot | `5` | Blocs de 5×5 cases |
| Séquence de rotations | `[0°, 90°, 180°, 270°]` | Une des 24 permutations possibles |
| Direction de rotation | `cw` | Sens horaire |
| Ordre de lecture | `LR-TB` | Gauche-droite, haut-bas |

La clé est indépendante du message : la même clé chiffre et déchiffre autant de
messages que souhaité. Le cryptogramme ne contient aucune métadonnée de longueur
par conception (voir l'[ADR 0001](../adr/0001-no-message-length-exposure.md)) :
le décodage traite toujours la grille entière, en remplissant le padding
éventuel par un caractère `?` plutôt que de stocker ou de laisser fuiter la
longueur d'origine.
