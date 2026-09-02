🇫🇷 Version française | [🇬🇧 English version](operations.md)

---

# Opérations

## Développement local

Le développement local est entièrement conteneurisé avec Docker Compose, et passe
par un reverse proxy Traefik local pour refléter la production plutôt que de
publier les ports des conteneurs directement. Voir [CONTRIBUTING.fr.md](../CONTRIBUTING.fr.md)
pour la configuration initiale de Traefik et de `/etc/hosts`.

```bash
cp .env.example .env
docker compose up
```

- Frontend : `http://hexarot.marvinlerouge.local`
- API backend : `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL : accessible directement sur `127.0.0.1:5433` pour l'outillage local
  (Prisma Studio, `psql`) ; ce port n'est pas routé via Traefik.

## Services

| Service | Image / build | Notes |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Conditionné par healthcheck ; `backend` attend qu'il soit sain avant de démarrer |
| `backend` | `backend/Dockerfile.dev` | Serveur de dev NestJS avec le code source monté en bind ; routé via Traefik sous `/api` |
| `frontend` | `frontend/Dockerfile.dev` | Serveur de dev Vite avec le code source monté en bind ; routé via Traefik à la racine de l'hôte |

`backend` et `frontend` rejoignent tous deux le réseau Docker externe
`traefik-public` (créé par l'instance Traefik locale), en plus du réseau interne
du projet.

## Variables d'environnement

Définies dans `.env` (à copier depuis `.env.example`, non commité) :

| Variable | Utilisée par | Rôle |
|---|---|---|
| `POSTGRES_USER` | `postgres`, `backend` | Utilisateur de la base de données |
| `POSTGRES_PASSWORD` | `postgres`, `backend` | Mot de passe de la base de données |
| `POSTGRES_DB` | `postgres`, `backend` | Nom de la base de données |
| `PORT` | `backend` | Port sur lequel le serveur NestJS écoute dans le conteneur (`3000`) |

`DATABASE_URL` pour le backend et `VITE_PROXY_TARGET` pour le frontend sont
dérivées automatiquement dans `docker-compose.yml` ; elles n'ont pas besoin
d'être définies manuellement.

## CI/CD

GitHub Actions s'exécute sur les pull requests vers `main` (`.github/workflows/ci.yml`) :

- **Job backend :** installation des dépendances, `prisma migrate deploy`, seed de
  la base, lint, exécution de la suite Jest (contre un service PostgreSQL 16).
- **Job frontend :** installation des dépendances, lint, exécution de la suite
  Vitest (en parallèle du job backend).

`sync-backlog.yml` synchronise `BACKLOG.md` vers les Issues GitHub et un tableau
Kanban à chaque push sur `main`. Il nécessite un secret de repository
`HEXAROT_PROJECT_TOKEN` (Personal Access Token classic avec les scopes `repo` et
`project`) ; voir [CONTRIBUTING.fr.md](../CONTRIBUTING.fr.md) pour la configuration.

`changelog.yml` régénère `CHANGELOG.md` à chaque push sur `main` et ouvre une pull
request plutôt que de pousser directement. Il nécessite l'activation de « Allow
GitHub Actions to create and approve pull requests » dans les paramètres Actions
du repository.
