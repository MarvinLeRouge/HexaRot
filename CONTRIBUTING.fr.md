🇫🇷 Version française | [🇬🇧 English version](CONTRIBUTING.md)

---

# Contribuer à HexaRot

Il s'agit avant tout d'un projet personnel. Les contributions externes (rapports de bugs, correctifs, petites améliorations) sont bienvenues mais dans une portée limitée.

## Prérequis

- **Docker & Docker Compose** : pour lancer la stack complète (backend, frontend, PostgreSQL)
- **Node.js 20+** : pour développer le backend ou le frontend sans Docker
- **Une instance Traefik locale** : nécessaire pour accéder à l'application via son domaine local, voir [Reverse proxy local](#reverse-proxy-local) ci-dessous
- **Git**

## Installation locale

```bash
git clone https://github.com/MarvinLeRouge/HexaRot.git
cd HexaRot
docker compose up
```

- Frontend : `http://hexarot.marvinlerouge.local`
- API backend : `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL reste accessible directement sur `127.0.0.1:5433` pour l'outillage local (Prisma Studio, `psql`) - non routé via Traefik.

### Backend seul

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend seul

```bash
cd frontend
npm install
npm run dev
```

## Lancer les tests

```bash
cd backend && npm run test       # tests unitaires (Jest)
cd backend && npm run test:e2e   # tests end-to-end
cd frontend && npm run test      # tests unitaires (Vitest)
```

## Workflow

1. Forker le dépôt et créer une branche à partir de `main`.
2. Faire la modification, avec des tests qui la couvrent.
3. Commiter en suivant la convention ci-dessous.
4. Pousser et ouvrir une pull request vers `main`.
5. La CI doit passer avant la revue.

## Nommage des branches

| Type | Préfixe |
|---|---|
| Fonctionnalité | `feat/description-courte` |
| Correction | `fix/description-courte` |
| Maintenance | `chore/description-courte` |
| Documentation | `docs/description-courte` |
| Refactoring | `refactor/description-courte` |
| Tests | `test/description-courte` |

Minuscules, kebab-case, sans caractères spéciaux.

## Convention de commit

Suivre [Conventional Commits](https://www.conventionalcommits.org/), impératif, minuscules, sans point final, avec une section `Modified files:` obligatoire :

```
<type>(<scope optionnel>): <résumé court>

Modified files:
- chemin/vers/fichier-a.ext - ce qui a été modifié
- chemin/vers/fichier-b.ext - ce qui a été modifié
```

Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

## Style de code

- **Backend :** vérifié par ESLint et Prettier. Lancer `npm run lint && npm run format` dans `backend/` avant de pousser
- **Frontend :** vérifié par ESLint et TypeScript. Lancer `npm run lint` dans `frontend/` avant de pousser

La CI rejettera toute pull request qui ne passe pas ces vérifications.

## Code de conduite

Ce projet suit un [Code de conduite](CODE_OF_CONDUCT.fr.md). En participant, vous vous engagez à le respecter.

## Licence

En contribuant, vous acceptez que vos contributions soient distribuées sous la [licence MIT](LICENSE) du projet.

---

## Reverse proxy local

Le développement local passe par un reverse proxy Traefik local, sur le même principe qu'en production, plutôt que de publier les ports des conteneurs directement.

### Mise en place

- Une instance Traefik déjà lancée localement, rattachée à un réseau Docker externe nommé `traefik-public`, avec un entrypoint `web` sur le port 80.
- Une entrée dans `/etc/hosts` faisant pointer `hexarot.marvinlerouge.local` vers `127.0.0.1` :
  ```
  127.0.0.1 hexarot.marvinlerouge.local
  ```

## Configuration de GitHub Actions

Le pipeline CI/CD nécessite un Personal Access Token (classic) stocké comme secret de repository.

**Pourquoi un classic token ?** L'API GraphQL GitHub Projects v2 ne supporte pas les fine-grained tokens à ce jour. Un classic token est donc requis pour les opérations sur le Kanban.

### 1. Créer le token

Aller dans **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** et générer un nouveau token avec les scopes suivants :

- `repo` (scope entier)
- `project`

Nommer le token `HEXAROT_PROJECT_TOKEN`.

### 2. Stocker le token

Aller dans **repo GitHub → Settings → Secrets and variables → Actions → Repository secrets** et créer un secret nommé `HEXAROT_PROJECT_TOKEN` avec la valeur du token.

### Sécurité

Le token est lié au compte propriétaire du repo. Ne jamais le committer dans le code. Le renouveler immédiatement s'il est compromis.
