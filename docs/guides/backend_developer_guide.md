[🇫🇷 Version française](backend_developer_guide.fr.md) | 🇬🇧 English version

---

# Backend developer guide

This guide covers day-to-day backend development conventions. See the
[backend architecture guide](../architecture/backend_architecture.md) for the
module map and data flow, and [docs/tests/](../tests/index.md) for the per-module
test contract that must be honoured for any change.

## Getting started

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

See [docs/operations.md](../operations.md) for the Docker Compose alternative.

## Adding a reading-order strategy

1. Implement `ReadingOrderStrategy` (see `reading-order/reading-order-strategy.interface.ts`)
   for the new traversal order.
2. Register it in `reading-order.registry.ts` under a stable identifier, since
   that identifier is what gets encoded into the key.
3. Add unit tests covering the traversal itself and its interaction with padding
   placement, following [docs/tests/reading-order.md](../tests/reading-order.md).
4. Update `KeyCodec` if the new strategy needs a new identifier range in the key
   payload.

## Adding a renderer

1. Implement a new renderer alongside `PngRenderer`/`SvgRenderer` in `renderer/`,
   consuming the same coloured-grid input.
2. Add the matching parser (grid ← output format) if the new format needs to be
   decodable.
3. Add integration tests exercising the full encode-then-decode round trip
   through the new format, mirroring the existing PNG/SVG test suites.

## Testing conventions

```bash
npm run test              # Jest unit tests
npm run test:cov          # coverage report
npm run test:e2e          # end-to-end tests (needs a reachable PostgreSQL instance)
npx jest path/to/file.spec.ts   # single test file
```

- `docs/tests/<module>.md` is a spec-first test contract per module: read it
  before writing or reviewing tests for that module, it can describe behaviour
  not otherwise documented.
- `PrismaService` connects eagerly on module init, so e2e tests need a real,
  authenticated PostgreSQL instance even for endpoints that don't touch the
  database.
- Coverage thresholds are enforced, with a higher bar on the algorithmic core
  (cipher, rotation, key) than globally.

## Conventions

- Functions are named verb-first: `rotateBlock`, `generateKey`, `parseKey`.
- Every implementation task should map to a `BACKLOG.md` entry (gitignored,
  local to the maintainer).
- Commit messages follow Conventional Commits with a mandatory file list; see
  the repository's `CLAUDE.md`.
