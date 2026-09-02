🇫🇷 Version française | [🇬🇧 English version](design-system.md)

---

# Système de design

Ce document décrit le langage visuel actuel du frontend HexaRot, tel qu'il existe
dans `frontend/src/style.css`. C'est un instantané des tokens et motifs en usage,
pas une spécification figée : plusieurs points sont encore en évolution (voir
[En cours](#en-cours) ci-dessous).

## Tokens de design

Les tokens sont définis comme des custom properties CSS sur `:root`, avec un bloc
de surcharge `prefers-color-scheme: dark` pour le mode sombre.

### Couleur

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--text` | `#6b6375` | `#9ca3af` | Texte courant |
| `--text-h` | `#08060d` | `#f3f4f6` | Titres, texte à fort contraste |
| `--text-muted` | `#756d80` | `#8890a0` | Texte secondaire |
| `--bg` | `#fff` | `#16171d` | Arrière-plan de page |
| `--border` | `#8d8a92` | `#6f6d78` | Bordures par défaut |
| `--code-bg` | `#f4f3ec` | `#1f2028` | Blocs de code, surfaces désactivées |
| `--accent` | `#aa3bff` | `#c084fc` | Couleur d'action principale |
| `--accent-bg` | `rgba(170, 59, 255, 0.1)` | `rgba(192, 132, 252, 0.15)` | Arrière-plans teintés accent |
| `--accent-border` | `rgba(170, 59, 255, 0.5)` | `rgba(192, 132, 252, 0.5)` | Bordures teintées accent |
| `--accent-contrast` | `#08060d` | `#08060d` | Texte sur fond `--accent` |
| `--danger` | `#c0392b` | `#f87171` | Erreurs |
| `--warning-border` | `#b45309` | `#fbbf24` | Bordures d'avertissement |
| `--warning-bg` | `rgba(180, 83, 9, 0.08)` | `rgba(251, 191, 36, 0.12)` | Arrière-plans d'avertissement |
| `--shadow` | ombre portée douce à deux couches | équivalent plus sombre | Surfaces surélevées |

### Typographie

- `--sans` / `--heading` : `system-ui, 'Segoe UI', Roboto, sans-serif`
- `--mono` : `ui-monospace, Consolas, monospace` (utilisé pour `code`)
- Taille de base : `18px` (`16px` sous `max-width: 1024px`), interligne `145%`,
  espacement des lettres `0.18px`
- Titres (`h1`, `h2`) : `font-weight: 500`, colorés avec `--text-h`

### Mise en page

- `#app` est plafonné à `max-width: 1126px`, centré, `min-height: 100svh`
- `color-scheme: light dark` laisse le navigateur adapter les contrôles de
  formulaire natifs

### Éléments interactifs

- Focus : `:focus-visible` reçoit un contour plein 2px `--accent` avec un
  décalage de 2px
- Boutons : `min-height: 44px` (dimensionné pour le tactile), `border-radius: 4px`
- `.btn-primary` : fond plein `--accent`, texte `--accent-contrast`, s'assombrit
  au survol/clic via `filter: brightness()`
- `.btn-secondary` : contour `--border`, fond transparent, bascule vers
  `--accent-border` / `--accent-bg` au survol
- Boutons désactivés : fond `--code-bg`, couleur `--text`, contour `--border`,
  `cursor: not-allowed`
- Champs texte, `select`, `textarea` : contour 1px `--border`, rayon `4px`,
  padding `8px 10px`

## En cours

Les points ci-dessous sont connus comme incomplets ou en évolution active ; ce
document décrit l'état actuel, pas un contrat figé.

- **Pas de fichier de tokens centralisé pour des consommateurs externes.** Les
  tokens vivent uniquement dans `frontend/src/style.css` ; il n'y a pas de
  `tokens.css` séparé ni d'export depuis un outil de design à synchroniser.
- **Le langage visuel de l'état "périmé" est encore en cours de stabilisation.**
  Les vues Encode/Decode/Key doivent distinguer visuellement un résultat
  "périmé" (paramètres modifiés depuis la génération du cryptogramme) d'un
  résultat frais, sans détruire le résultat précédent ni désactiver les actions
  de récupération comme Copier/Télécharger. Les niveaux de contraste des
  contrôles désactivés dans cet état ont été révisés plusieurs fois (voir les
  rapports `.impeccable/critique/`).
- **La gestion des thèmes clair/sombre repose uniquement sur
  `prefers-color-scheme`.** Il n'y a pas de bascule manuelle de thème ; c'est une
  simplification délibérée pour l'instant, pas une décision définitive.
- **Le dimensionnement du panneau de résultat a des questions ouvertes.** La
  sortie du cryptogramme a été signalée comme visuellement petite par rapport à
  la mise en page environnante sur grand écran ; aucun ratio ou taille minimale
  cible n'a encore été fixé.
