# 4. Route local development through Traefik instead of published ports

## Status

Accepted

## Context

Local development originally published the `backend` and `frontend` container
ports directly on the host. Production, however, is expected to sit behind a
reverse proxy. Developing against directly published ports meant the local
topology didn't match production, and routing/host-header behaviour couldn't be
exercised locally.

## Decision

Route local development through a local Traefik reverse proxy instead of
publishing container ports:

- `backend` and `frontend` join an external `traefik-public` Docker network (in
  addition to the project's internal network) and carry Traefik routing labels
  keyed on the host `hexarot.marvinlerouge.local`, with the backend routed under
  the `/api` path prefix.
- Container ports are no longer published directly; `postgres` binds to
  `127.0.0.1` only, for local tooling access, and stays off the public network.
- Vite's dev server is configured to allow the `hexarot.marvinlerouge.local`
  host header, since Vite's default host-header check otherwise returns 403 for
  any host other than `localhost`.

Developers need a Traefik instance already running locally, attached to the
`traefik-public` network, plus a `/etc/hosts` entry pointing
`hexarot.marvinlerouge.local` to `127.0.0.1`; see
[docs/operations.md](../operations.md) for the full setup.

## Consequences

- Local development now exercises the same host-based routing topology as
  production, catching routing/proxy issues earlier.
- Onboarding requires a one-time Traefik setup step; this is documented in
  [CONTRIBUTING.md](../../CONTRIBUTING.md) and [docs/operations.md](../operations.md).
- The backend's own `/api` prefix must not be stripped by Traefik's routing
  rule, and Vite's `allowedHosts` configuration must stay in sync with the
  chosen local hostname.
