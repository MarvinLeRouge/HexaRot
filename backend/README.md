[🇫🇷 Version française](README.fr.md) | 🇬🇧 English version

---

# HexaRot backend

NestJS 11 API implementing the HexaRot visual cipher: message pre-processing, grid
construction, block rotation, key encode/decode, and PNG/SVG rendering.

See the root [README](../README.md) for the project overview and the
[backend architecture guide](../docs/architecture/backend_architecture.md) for a
detailed module breakdown.

---

## Requirements

- Node.js and npm
- PostgreSQL 16 (via the root `docker-compose.yml`, or a local instance)

Running through Docker Compose from the repository root is the recommended setup; see
the root README's Quick start section.

---

## Setup

```bash
npm install
npx prisma migrate dev     # apply migrations and regenerate the Prisma client
npx prisma db seed         # seed the Hexahue alphabet data
```

The Prisma client is generated to `generated/prisma` (not the default `node_modules`
location), in CommonJS format.

---

## Development

```bash
npm run start:dev          # dev server with watch
npm run build               # production build
npm run lint                 # ESLint with auto-fix
npm run format              # Prettier
```

## Testing

```bash
npm run test                # Jest unit tests
npm run test:watch          # Jest watch mode
npm run test:cov            # coverage report
npm run test:e2e            # end-to-end tests (requires a reachable PostgreSQL instance)
```

Run a single test file:

```bash
npx jest path/to/file.spec.ts
```

---

## Module layout

```
src/
├── alphabet/        # VisualAlphabet interface + HexahueAlphabet implementation
├── cipher/          # Pre-processing (uppercase, transliteration), grid construction
├── rotation/        # Block rotation engine (encode + inverse)
├── key/             # KeyCodec, base36 encode/decode/validate
├── reading-order/   # ReadingOrderStrategy implementations
├── renderer/        # PngRenderer (Sharp), SvgRenderer
├── validation/       # GCD-based parameter validator
├── shared/           # Shared types and testing utilities
└── api/             # NestJS controllers + DTOs
```

Each domain is a standalone NestJS module registered in `app.module.ts`. All API
routes are prefixed with `/api`; see the [API reference](../docs/api/api_endpoints.md)
for endpoint details.

---

## Database

Three Prisma models: `Alphabet` → `Symbol` → `ColorCase`. Seed data for the Hexahue
alphabet lives in `prisma/seed.ts`.

```bash
npx prisma studio           # browse the database
```
