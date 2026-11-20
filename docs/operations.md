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
| `backend` | `backend/Dockerfile.dev` | NestJS dev server with a bind-mounted source tree; applies pending Prisma migrations (`migrate deploy`) and runs the seed on start (seed skipped when `SEED_ADMIN_PASSWORD` is empty; a placeholder value makes the seed fail and the backend not start); routed through Traefik under `/api` |
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
| `LOG_LEVEL` | `backend` | Minimum log level (`info` by default; `debug`, `warn`, `error`, `silent`...) |

`DATABASE_URL` for the backend and `VITE_PROXY_TARGET` for the frontend are
derived automatically inside `docker-compose.yml`; they don't need to be set
manually.

### Production

On the VPS, under `/home/mlr/marvinlerouge.dev/hexarot/`, `compose/` holds only
the `docker-compose.prod.yml` fetched by the deploy workflow, and `shared/env/`
holds the two env files (`chmod 600`, never committed). Containers get their
configuration only through `env_file`: the compose file interpolates nothing
from a file (the domain is written in the Traefik rules; `IMAGE_TAG` is set to
the deployed commit SHA by the deploy workflow, and defaults to `latest` for
manual compose commands). Both `postgres` and `backend` load `app.env`, then `secrets.env`,
which wins.

| File | Holds | Template |
|---|---|---|
| `shared/env/app.env` | non-secret settings: `NODE_ENV`, `PORT`, `FRONTEND_BASE_URL`, `JWT_EXPIRES_IN`, SMTP host and sender names, `SENTRY_ENVIRONMENT` | [`docker/env/app.env.example`](../docker/env/app.env.example) |
| `shared/env/secrets.env` | every topic holding a secret, kept whole: `POSTGRES_*` and `DATABASE_URL`, `JWT_SECRET`, SMTP credentials, `SEED_ADMIN_*`, Sentry DSNs | [`docker/env/secrets.env.example`](../docker/env/secrets.env.example) |

`POSTGRES_PASSWORD` and the password inside `DATABASE_URL` must match: the first
initialises the database volume (first start only), the second is what Prisma
connects with.

## Error tracking (Sentry)

Unhandled backend errors (any 5xx, not the expected 4xx) and uncaught frontend
errors are reported to Sentry. Reporting is off whenever the DSN is empty, which
is the default for local development and CI. Only stack traces are sent: no
request bodies, headers, cookies, query strings, user info, stack frame
variables or source lines, and no tracing or session replay.

| Variable | Read by | Local source | Production source |
|---|---|---|---|
| `SENTRY_BACKEND_DSN` | backend, at runtime | `.env` | `../shared/env/secrets.env` on the VPS |
| `SENTRY_ENVIRONMENT` | backend, at runtime | `SENTRY_ENVIRONMENT` in `.env` (`development`) | `app.env` (`production`) |
| `SENTRY_FRONTEND_DSN` | backend, at runtime (relay allow-list) | `.env` | `secrets.env` |
| `VITE_SENTRY_DSN` | frontend, at build time | `SENTRY_FRONTEND_DSN` in `.env` | `VITE_SENTRY_DSN` GitHub secret, passed as a build argument |
| `VITE_SENTRY_ENVIRONMENT` | frontend, at build time | `SENTRY_ENVIRONMENT` in `.env` | `production`, set in `build-push-deploy.yml` |

The frontend DSN ends up in the public bundle: it identifies the project, it
is not a secret.

The frontend does not call Sentry directly: ad-blockers and browser tracking
protection drop requests to `*.sentry.io`. It posts its events to
`/api/<hash of its DSN>` on its own origin, and the backend
(`serveTunnelIntegration`) answers that path before Nest and streams the
envelope to Sentry. Only envelopes for `SENTRY_FRONTEND_DSN` and the backend's
own DSN are forwarded; any other DSN gets a 403. The relay only runs when the
backend has a `SENTRY_BACKEND_DSN`, and `SENTRY_FRONTEND_DSN` must be the exact DSN the
bundle was built with (`VITE_SENTRY_DSN`): otherwise frontend events are lost.
The backend logs a warning at startup when only one of `SENTRY_BACKEND_DSN` and
`SENTRY_FRONTEND_DSN` is set. The relay answers before Nest, so the app's
throttling and body limits do not apply to it; abuse can only spend the Sentry
quota.

One-time setup, outside the repository:

1. In Sentry (EU region), create two projects: `hexarot-backend` (NestJS) and
   `hexarot-frontend` (Vue).
2. In each project's *Security & Privacy* settings, enable *Data Scrubber*,
   *Use Default Scrubbers* and *Prevent Storing of IP Addresses*.
3. Add the frontend DSN as the `VITE_SENTRY_DSN` repository secret.
4. On the VPS, add `SENTRY_BACKEND_DSN=<backend DSN>` and
   `SENTRY_FRONTEND_DSN=<frontend DSN>` to `../shared/env/secrets.env`, and
   `SENTRY_ENVIRONMENT=production` to `../shared/env/app.env`, then redeploy.
   The backend loads both files, `secrets.env` last.

## Logging

The backend logs through pino (`nestjs-pino`): every entry, Nest's own boot
messages included, is one JSON line on stdout, read with
`docker logs hexarot-backend`. Local development pretty-prints the same entries
(`pino-pretty`); `NODE_ENV=production` writes raw JSON.

Each request adds one access line (`request completed`) with its id, method,
path, status code and response time. Like error tracking, it holds no private
data: no headers (so no JWT), cookies, bodies, query strings or client address,
and log messages name users by id, never by email address. Health checks are not
logged. `LOG_LEVEL` sets the minimum level (`info` by default, `silent` under
tests).

## Health check

`GET /api/health` is public and answers `200 {"status":"ok"}` after a
`SELECT 1` against the database, or `503 {"status":"error"}` when the database
is unreachable (not reported to Sentry, like any expected HTTP error). It is
subject to the default rate limit (20 requests per minute per IP), so an
external monitor should poll at most every few seconds.

In production, `docker-compose.prod.yml` probes it every 30 seconds with
`wget`: Traefik only routes to the backend once it is healthy, and the deploy
workflow waits up to 90 seconds for that state, then fails with the backend's
last log lines. The local stack has no healthcheck.

## CI/CD

GitHub Actions runs on pull requests to `main` (`.github/workflows/ci.yml`):

- **Backend job:** install dependencies, run `prisma migrate deploy`, seed the
  database, lint, run the Jest suite (against a PostgreSQL 16 service container).
- **Frontend job:** install dependencies, lint, run the Vitest suite (in parallel
  with the backend job).

`sync-backlog.yml` syncs `BACKLOG.md` to GitHub Issues and a Kanban board when a
pull request touching it is merged into `main`. It requires a
`HEXAROT_PROJECT_TOKEN` repository secret (classic Personal Access Token with
`repo` and `project` scopes); see [CONTRIBUTING.md](../CONTRIBUTING.md) for
setup. When an item's dependencies are all `done`, the workflow promotes it to
`ready` through its own pull request, which GitHub auto-merges once the required
"CI status" check passes. This needs "Allow auto-merge" enabled in the
repository settings. A rerun closes any earlier auto-promotion pull request
still open instead of opening a duplicate. The script's tests run with
`node --test .github/scripts/`.

`CHANGELOG.md` is regenerated primarily by a local `post-commit` hook
(appended to `.husky/post-commit`, calling `scripts/changelog-post-commit.sh`)
that runs git-cliff and folds the result into the same commit before it's
ever pushed, so a feature PR already carries its own changelog entry. Each
developer adds this call to their own local `.husky/post-commit` (gitignored,
personal per-machine, like this repo's other non-`pre-commit` Husky hooks;
not automatable via `pre-commit install` since this repo uses Husky, not the
`pre-commit` framework).

As a fallback, `changelog.yml` still regenerates `CHANGELOG.md` on push to
`main` and opens a pull request rather than pushing directly, in case a
commit lands on `main` without going through the local hook. It requires
"Allow GitHub Actions to create and approve pull requests" to be enabled in
the repository's Actions settings.
