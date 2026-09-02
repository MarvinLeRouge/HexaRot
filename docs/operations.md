[🇫🇷 Version française](operations.fr.md) | 🇬🇧 English version

---

# Operations

## Local development

Local development is fully containerised with Docker Compose, and routed through
a local Traefik reverse proxy to mirror production instead of publishing
container ports directly. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the
one-time Traefik and `/etc/hosts` setup.

```bash
cp .env.example .env
docker compose up
```

- Frontend: `http://hexarot.marvinlerouge.local`
- Backend API: `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL: reachable directly at `127.0.0.1:5433` for local tooling (Prisma
  Studio, `psql`); this port is not routed through Traefik.

## Services

| Service | Image / build | Notes |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Healthcheck-gated; `backend` waits for it to be healthy before starting |
| `backend` | `backend/Dockerfile.dev` | NestJS dev server with a bind-mounted source tree; routed through Traefik under `/api` |
| `frontend` | `frontend/Dockerfile.dev` | Vite dev server with a bind-mounted source tree; routed through Traefik at the host root |

Both `backend` and `frontend` join the external `traefik-public` Docker network
(created by the local Traefik instance) in addition to the project's internal
network.

## Environment variables

Defined in `.env` (copy from `.env.example`, not committed):

| Variable | Used by | Purpose |
|---|---|---|
| `POSTGRES_USER` | `postgres`, `backend` | Database user |
| `POSTGRES_PASSWORD` | `postgres`, `backend` | Database password |
| `POSTGRES_DB` | `postgres`, `backend` | Database name |
| `PORT` | `backend` | Port the NestJS server listens on inside the container (`3000`) |

`DATABASE_URL` for the backend and `VITE_PROXY_TARGET` for the frontend are
derived automatically inside `docker-compose.yml`; they don't need to be set
manually.

## CI/CD

GitHub Actions runs on pull requests to `main` (`.github/workflows/ci.yml`):

- **Backend job:** install dependencies, run `prisma migrate deploy`, seed the
  database, lint, run the Jest suite (against a PostgreSQL 16 service container).
- **Frontend job:** install dependencies, lint, run the Vitest suite (in parallel
  with the backend job).

`sync-backlog.yml` syncs `BACKLOG.md` to GitHub Issues and a Kanban board on push
to `main`. It requires a `HEXAROT_PROJECT_TOKEN` repository secret (classic
Personal Access Token with `repo` and `project` scopes); see
[CONTRIBUTING.md](../CONTRIBUTING.md) for setup.

`changelog.yml` regenerates `CHANGELOG.md` on push to `main` and opens a pull
request rather than pushing directly. It requires "Allow GitHub Actions to
create and approve pull requests" to be enabled in the repository's Actions
settings.
