# HexaRot — Test Strategy Index

## 1. Philosophy

Tests are written **before implementation** (spec-first). Each spec document in this
folder defines the expected behaviour of a module from the outside — inputs, outputs,
edge cases, and error conditions. The Implementation thread must honour these specs.
Tests are the contract; implementation is the fulfilment.

Unit tests must be **pure and isolated**: no database access, no filesystem, no network.
Dependencies are mocked at the module boundary.

Integration tests (API layer) are the only layer allowed to hit a real database, and
only in a dedicated test environment.

---

## 2. Coverage Thresholds

| Scope | Threshold | Metric |
|---|---|---|
| Algorithmic core (cipher, rotation, key, reading-order) | **90%** | branch coverage |
| Peripheral modules (renderer, validation, API controllers) | **75%** | branch coverage |
| Global (backend + frontend combined) | **> 75%** | branch coverage |

These thresholds are enforced in CI (Jest `--coverage` with `coverageThreshold` in
`jest.config.ts`, Vitest equivalent for the frontend).

---

## 3. Test Layers

### Unit tests (Jest — backend)
- Scope: pure functions and classes, no I/O
- Location: co-located with source files (`*.spec.ts`)
- Mocking: Jest mocks for any injected dependency (PrismaClient, etc.)
- Must run in under 30 seconds total

### Integration tests (Jest — backend)
- Scope: HTTP endpoints via NestJS testing module + supertest
- Location: `test/` directory at backend root
- Requires: seeded PostgreSQL test database
- Must clean up state between runs (transactions or truncation)

### Unit tests (Vitest — frontend)
- Scope: Vue components and Pinia stores
- Location: co-located with source files (`*.spec.ts`)
- Mocking: `vi.mock` for API calls (fetch/axios)

---

## 4. Conventions

- Test file naming: `<module>.spec.ts`
- Each `describe` block maps to one class or function
- Each `it` block describes one behaviour, written as a sentence:
  `it('returns an empty array when input is an empty string')`
- No logic in tests: no loops, no conditionals — one assertion path per `it`
- Shared fixtures go in a `__fixtures__` directory adjacent to the spec file

---

## 5. Backlog Correspondence

| Backlog item | Spec document | Layer |
|---|---|---|
| FEAT-001 (VisualAlphabet / Hexahue) | [cipher.md](./cipher.md) | Unit |
| FEAT-002 (Pre-processing) | [cipher.md](./cipher.md) | Unit |
| FEAT-003 (Parameter validation) | [cipher.md](./cipher.md) | Unit |
| FEAT-004 (Key codec) | [key.md](./key.md) | Unit |
| FEAT-005 (Reading order strategies) | [reading-order.md](./reading-order.md) | Unit |
| FEAT-006 (Grid construction) | [cipher.md](./cipher.md) | Unit |
| FEAT-007 (Block rotation engine) | [rotation.md](./rotation.md) | Unit |
| FEAT-008 (Metadata header) | [cipher.md](./cipher.md) | Unit |
| FEAT-009 (PNG renderer) | [renderer.md](./renderer.md) | Unit + Integration |
| FEAT-010 (SVG renderer) | [renderer.md](./renderer.md) | Unit + Integration |
| FEAT-011 (Encode endpoint) | [api.md](./api.md) | Integration |
| FEAT-012 (Decode endpoint) | [api.md](./api.md) | Integration |
| FEAT-013 (Key endpoints) | [api.md](./api.md) | Integration |
| FEAT-014/015/016 (Frontend views) | [frontend.md](./frontend.md) | Unit (Vitest) |
| TEST-001 | cipher.md, key.md, rotation.md, reading-order.md | Consolidation |
| TEST-002 | api.md | Consolidation |
| TEST-003 | frontend.md | Consolidation |

---

## 6. Open Points

- **PostgreSQL in CI**: TEST-002 requires a live database in the CI environment.
  CI-001 is `done` but it is not confirmed whether a PostgreSQL service is provisioned.
  If not, a CI amendment or a new CI item is required before TEST-002 can run.
  → **Pending confirmation from project owner.**
