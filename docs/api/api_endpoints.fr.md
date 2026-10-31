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
| `POST` | `/correlation-score` | Calculer le score de corrélation d'un cryptogramme |
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
  "key": "HR1·2T51",
  "warnings": [],
  "unknownChars": [],
  "size": "medium"
}
```

`message` est limité à 29 000 caractères, vérifiés à nouveau après passage en
majuscules (certains caractères, comme `ß`, en deviennent deux). Un message
plus long reçoit une 400.

L'image est limitée à 66 666 666 pixels (un budget mémoire de 200 Mo par
requête). `small` et `medium` passent toujours dans la limite de longueur ;
`large` dépend de la longueur du message et du bloc pivot. Une combinaison
au-delà de la limite reçoit une 400 dont le message donne la taille de
l'image, avant tout rendu. `POST /decode` applique la même limite de pixels
aux PNG envoyés, et `POST /key/generate` refuse un bloc pivot et une taille
qu'aucun message ne pourrait respecter (par exemple un bloc de 181 ou plus en
`large`).

## `POST /decode`

```json
POST /api/decode
{
  "cryptogram": "<PNG encodé en base64 ou chaîne SVG brute>",
  "format": "png",
  "key": "HR1·2T51"
}
```

```json
{
  "message": "HELLO WORLD"
}
```

L'image est toujours lue à la taille enregistrée dans la clé. Un champ `size`
est encore accepté par compatibilité, quelle que soit sa valeur, mais ignoré.

Le corps de la requête est limité à 24 Mo sur cette route, de quoi accepter le
plus gros cryptogramme que `POST /encode` peut produire (un SVG d'environ
19 Mo). Un corps plus gros reçoit une 413. Toutes les autres routes sont limitées
à 256 ko, de quoi accepter n'importe quel message valide.

## `POST /correlation-score`

```json
POST /api/correlation-score
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
  "score": 0.83
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
  "key": "HR1·2T51"
}
```

## `POST /key/parse`

```json
POST /api/key/parse
{
  "key": "HR1·2T51"
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
HR1·2T51
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
