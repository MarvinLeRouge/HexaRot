[🇫🇷 Version française](CONTRIBUTING.fr.md) | 🇬🇧 English version

---

# Contributing to HexaRot

This is primarily a personal project. External contributions (bug reports, fixes, small improvements) are welcome but limited in scope.

## Prerequisites

- **Docker & Docker Compose**: to run the full stack (backend, frontend, PostgreSQL)
- **Node.js 20+**: for backend or frontend development without Docker
- **A local Traefik instance**: required to reach the app through its local domain, see [Local reverse proxy](#local-reverse-proxy) below
- **Git**

## Local setup

```bash
git clone https://github.com/MarvinLeRouge/HexaRot.git
cd HexaRot
docker compose up
```

- Frontend: `http://hexarot.marvinlerouge.local`
- Backend API: `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL remains reachable directly at `127.0.0.1:5433` for local tooling (Prisma Studio, `psql`) - it is not routed through Traefik.

### Backend only

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

## Running tests

```bash
cd backend && npm run test       # unit tests (Jest)
cd backend && npm run test:e2e   # end-to-end tests
cd frontend && npm run test      # unit tests (Vitest)
```

## Workflow

1. Fork the repository and create a branch off `main`.
2. Make your change, with tests covering it.
3. Commit following the convention below.
4. Push and open a pull request against `main`.
5. CI must pass before review.

## Branch naming

| Type | Prefix |
|---|---|
| Feature | `feat/short-description` |
| Bug fix | `fix/short-description` |
| Chore | `chore/short-description` |
| Documentation | `docs/short-description` |
| Refactor | `refactor/short-description` |
| Tests | `test/short-description` |

Use lowercase kebab-case. No special characters.

## Commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/), imperative mood, lowercase summary, no trailing period, with a mandatory `Modified files:` section:

```
<type>(<optional scope>): <short summary>

Modified files:
- path/to/file-a.ext - what was changed
- path/to/file-b.ext - what was changed
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

## Code style

- **Backend:** enforced by ESLint and Prettier. Run `npm run lint && npm run format` in `backend/` before pushing
- **Frontend:** enforced by ESLint and TypeScript. Run `npm run lint` in `frontend/` before pushing

CI will reject any pull request that fails these checks.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

---

## Local reverse proxy

Local development is routed through a local Traefik reverse proxy, mirroring the topology used in production, instead of publishing container ports directly.

### Setup

- A Traefik instance already running locally, attached to an external Docker network named `traefik-public`, with a `web` entrypoint on port 80.
- An entry in `/etc/hosts` pointing `hexarot.marvinlerouge.local` to `127.0.0.1`:
  ```
  127.0.0.1 hexarot.marvinlerouge.local
  ```

## GitHub Actions setup

The CI/CD pipeline requires a Personal Access Token (classic) stored as a repository secret.

**Why a classic token?** The GitHub Projects v2 GraphQL API does not support fine-grained tokens at this time. A classic token is therefore required for Kanban board operations.

### 1. Create the token

Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** and generate a new token with the following scopes:

- `repo` (entire scope)
- `project`

Name it `HEXAROT_PROJECT_TOKEN`.

### 2. Store the token

Go to **repo GitHub → Settings → Secrets and variables → Actions → Repository secrets** and create a secret named `HEXAROT_PROJECT_TOKEN` with the token value.

### Security

The token is tied to the account that owns the repository. Never commit it to the codebase. Rotate it immediately if compromised.

## Build & Deploy pipeline secrets

`.github/workflows/build-deploy.yml` builds the backend and frontend production images, pushes them to GHCR, and deploys to the VPS over SSH. It requires the following repository secrets, in addition to the ambient `GITHUB_TOKEN` used for the GHCR push (no extra token needed there).

Go to **repo GitHub → Settings → Secrets and variables → Actions → Repository secrets** and create each of the following:

| Secret | Purpose |
|---|---|
| `DEPLOY_SSH_HOST` | Hostname or IP of the VPS |
| `DEPLOY_SSH_USER` | SSH user used to connect to the VPS |
| `DEPLOY_SSH_PRIVATE_KEY` | Private key authorized on the VPS for that user |
| `DOMAIN` | Public domain the app is served on, used by `docker-compose.prod.yml`'s Traefik labels |
| `VITE_API_BASE_URL` | Base URL the frontend uses to reach the backend API, baked in at build time |

### Security

These secrets grant SSH access to the production server and control public routing. Never commit them to the codebase. Rotate the SSH key immediately if compromised.

### VPS environment files

Separately from the repository secrets above, the deploy step's seed run (`npx prisma db seed`, see `backend/prisma/seed.ts`) reads two variables from the backend service's own env files on the VPS. Add them to `shared/env/secrets.env` (never `app.env`, since these are credentials):

| Variable | Purpose |
|---|---|
| `SEED_ADMIN_EMAIL` | Email of the single admin account |
| `SEED_ADMIN_PASSWORD` | Its password, hashed at seed time - never store the plaintext elsewhere |

The seed step is idempotent (`upsert` with `update: {}` on conflict): it creates the admin account once and never touches it again on later deploys, even if these values change afterwards.
