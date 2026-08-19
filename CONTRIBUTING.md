[🇫🇷 Version française](CONTRIBUTING.fr.md) | 🇬🇧 English version

---

# Contributing to HexaRot

## Local development environment

Local development is routed through a local Traefik reverse proxy, mirroring the
topology used in production, instead of publishing container ports directly.

### Prerequisites

- A Traefik instance already running locally, attached to an external Docker network
  named `traefik-public`, with a `web` entrypoint on port 80.
- An entry in `/etc/hosts` pointing `hexarot.marvinlerouge.local` to `127.0.0.1`:
  ```
  127.0.0.1 hexarot.marvinlerouge.local
  ```

### Running the stack

```bash
docker compose up
```

- Frontend: `http://hexarot.marvinlerouge.local`
- Backend API: `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL remains reachable directly at `127.0.0.1:5433` for local tooling
  (Prisma Studio, `psql`) - it is not routed through Traefik.

## GitHub Actions setup

The CI/CD pipeline requires a Personal Access Token (classic) stored as a repository secret.

**Why a classic token?** The GitHub Projects v2 GraphQL API does not support fine-grained
tokens at this time. A classic token is therefore required for Kanban board operations.

### 1. Create the token

Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
and generate a new token with the following scopes:

- `repo` (entire scope)
- `project`

Name it `HEXAROT_PROJECT_TOKEN`.

### 2. Store the token

Go to **repo GitHub → Settings → Secrets and variables → Actions → Repository secrets**
and create a secret named `HEXAROT_PROJECT_TOKEN` with the token value.

### Security

The token is tied to the account that owns the repository. Never commit it to the codebase.
Rotate it immediately if compromised.
