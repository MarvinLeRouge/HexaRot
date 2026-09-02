🇫🇷 Version française | [🇬🇧 English version](backend_developer_guide.md)

---

# Guide développeur backend

Ce guide couvre les conventions de développement backend au quotidien. Voir le
[guide d'architecture backend](../architecture/backend_architecture.fr.md) pour
la carte des modules et le flux de données, et [docs/tests/](../tests/index.md)
pour le contrat de test par module à respecter pour toute modification.

## Démarrage

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Voir [docs/operations.fr.md](../operations.fr.md) pour l'alternative Docker
Compose.

## Ajouter une stratégie d'ordre de lecture

1. Implémenter `ReadingOrderStrategy` (voir `reading-order/reading-order-strategy.interface.ts`)
   pour le nouvel ordre de parcours.
2. L'enregistrer dans `reading-order.registry.ts` sous un identifiant stable,
   puisque cet identifiant est ce qui est encodé dans la clé.
3. Ajouter des tests unitaires couvrant le parcours lui-même et son interaction
   avec le placement du padding, en suivant [docs/tests/reading-order.md](../tests/reading-order.md).
4. Mettre à jour `KeyCodec` si la nouvelle stratégie nécessite une nouvelle plage
   d'identifiants dans la charge utile de la clé.

## Ajouter un renderer

1. Implémenter un nouveau renderer aux côtés de `PngRenderer`/`SvgRenderer` dans
   `renderer/`, consommant la même entrée de grille colorée.
2. Ajouter le parseur correspondant (grille ← format de sortie) si le nouveau
   format doit être décodable.
3. Ajouter des tests d'intégration exerçant l'aller-retour complet
   encodage-puis-décodage via le nouveau format, en suivant le modèle des suites
   de tests PNG/SVG existantes.

## Conventions de test

```bash
npm run test              # tests unitaires Jest
npm run test:cov          # rapport de couverture
npm run test:e2e          # tests de bout en bout (nécessite une instance PostgreSQL accessible)
npx jest path/to/file.spec.ts   # un seul fichier de test
```

- `docs/tests/<module>.md` est un contrat de test spec-first par module : le lire
  avant d'écrire ou de relire des tests pour ce module, il peut décrire un
  comportement non documenté ailleurs.
- `PrismaService` se connecte de façon eager à l'initialisation du module, donc
  les tests e2e nécessitent une vraie instance PostgreSQL authentifiée, même pour
  des endpoints qui ne touchent pas la base de données.
- Des seuils de couverture sont appliqués, avec une barre plus haute sur le
  cœur algorithmique (cipher, rotation, key) qu'au niveau global.

## Conventions

- Les fonctions sont nommées avec un verbe en premier : `rotateBlock`,
  `generateKey`, `parseKey`.
- Chaque tâche d'implémentation devrait correspondre à une entrée dans
  `BACKLOG.md` (gitignored, local au mainteneur).
- Les messages de commit suivent Conventional Commits avec une liste de
  fichiers obligatoire ; voir le `CLAUDE.md` du dépôt.
