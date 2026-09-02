🇫🇷 Version française | [🇬🇧 English version](frontend_developer_guide.md)

---

# Guide développeur frontend

Ce guide couvre les conventions de développement frontend au quotidien. Voir le
[guide d'architecture frontend](../architecture/frontend_architecture.fr.md)
pour la vue d'ensemble de la structure et [docs/design-system.fr.md](../design-system.fr.md)
pour le langage visuel actuel.

## Démarrage

```bash
cd frontend
npm install
npm run dev
```

Voir [docs/operations.fr.md](../operations.fr.md) pour l'alternative Docker
Compose, qui passe par Traefik plutôt que directement par le serveur de dev
Vite.

## Ajouter une vue

1. Créer le composant de vue sous `views/`.
2. Ajouter un store Pinia sous `stores/` si la vue nécessite son propre état
   (paramètres du formulaire, résultat, chargement, erreur, péremption).
3. Enregistrer la route dans `router/`.
4. Ajouter tout nouveau texte d'interface à `locales/en.json` ; ne pas coder en
   dur de chaînes destinées à l'utilisateur.
5. Ajouter un fichier de test `.spec.ts` à côté de la vue.

## Stores et péremption

Le store de chaque vue suit si le résultat actuellement affiché est périmé par
rapport aux paramètres courants du formulaire, plutôt que de vider le résultat
dès qu'un paramètre change. Voir l'[ADR 0005](../adr/0005-stale-result-marked-not-destroyed.md)
pour la justification. Lors de l'ajout d'un nouveau store, suivre le même
principe : conserver le dernier résultat réussi à travers les changements de
paramètres et les requêtes échouées, et exposer un indicateur "périmé" dérivé
que la vue peut utiliser pour ajuster son UI (par exemple désactiver des
raccourcis de re-soumission, sans désactiver les actions de récupération comme
copier/télécharger).

## Conventions de style

- Utiliser les custom properties CSS définies dans `style.css` (voir
  [docs/design-system.fr.md](../design-system.fr.md)) plutôt que de coder en dur
  des couleurs ou des espacements.
- Respecter le contour `:focus-visible` et la taille minimale de 44px pour les
  cibles tactiles des éléments interactifs.

## Conventions de test

```bash
npm run test              # Vitest
npm run test:cov          # rapport de couverture
```

Faire correspondre la structure des tests à celle du code source ; le fichier
de spec d'une vue se trouve à côté de la vue.

## Internationalisation

Toutes les chaînes destinées à l'utilisateur passent par `vue-i18n` et
`locales/en.json`, même si seul l'anglais est implémenté en V1, afin que la
locale française prévue (voir [docs/roadmap.fr.md](../roadmap.fr.md)) puisse
être ajoutée sans passe de reprise.
