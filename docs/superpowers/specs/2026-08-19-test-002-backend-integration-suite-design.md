# TEST-002 Backend Integration Suite Design Spec

**Status:** Approved by the user (2026-08-19), ready for writing-plans.

**Backlog item:** TEST-002, `status: ready`, `depends-on: FEAT-011, FEAT-012, FEAT-013, TEST-001, CI-003` (all done), `domain: api`, `complexity: M`.

## Context

`docs/tests/api.md` is the authoritative spec for this item. It is unambiguous:
"All tests in this document are integration tests... They require a seeded
PostgreSQL test database (full Hexahue alphabet)." This matches
`docs/tests/index.md`'s stated philosophy ("Integration tests (API layer) are
the only layer allowed to hit a real database, and only in a dedicated test
environment").

The current state does not meet this. All four existing e2e spec files
(`backend/test/{app,encode,decode,key}.e2e-spec.ts`, 41 test cases total,
covering every acceptance criterion TEST-002 lists) begin with:

```typescript
jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
```

and override `HexahueAlphabet` with a `MockAlphabet` test double
(`symbolWidth: 3, symbolHeight: 2`, supports only `A`, `B`). None of them
touch a real database. This is exactly the failure shape documented in
[[project-prisma-esm-cjs-boot-bug]]: a real Prisma ESM/CJS boot bug shipped
across three merged features undetected, specifically because
"PrismaService is always mocked" in every test, unit and e2e alike.

Separately, `.github/workflows/ci.yml`'s backend job provisions a real
`postgres:16` service (via CI-003, already `done`) and runs
`prisma migrate deploy` + `prisma db seed` against it - but no CI step ever
runs `npm run test:e2e`. The provisioned database currently goes completely
unused.

**A schema fact that substantially simplifies this work:** `prisma/schema.prisma`
has exactly three models - `Alphabet`, `Symbol`, `ColorCase` - all seed data,
none written to by any encode/decode/key endpoint at runtime. The app's
relationship to the database is entirely read-only. `docs/tests/api.md`'s
isolation-strategy paragraph ("wrap each test in a transaction that is rolled
back, or truncate mutable tables in `afterEach`") is therefore moot: there is
no mutable state to isolate. This removes what would otherwise be the
riskiest, most complex part of this migration.

## Decision 1: replace the mocks, don't add a parallel real-DB suite

Considered keeping the existing 41 mocked tests as-is and adding a small
number of new real-DB smoke tests alongside them (a "hybrid" - lighter
migration, closes the boot-path risk without touching existing assertions).
**Rejected**: `docs/tests/api.md` is explicit that these ARE the integration
tests and they must hit a real database - a parallel hybrid suite would
leave the authoritative spec permanently unmet. Given the schema is
read-only (Decision context above), the full replacement is not
meaningfully riskier than the hybrid, just more thorough. **Decided:**
remove the `jest.mock(...)` and `.overrideProvider(HexahueAlphabet)...`
lines from all four spec files; let Nest wire the real `PrismaService` and
real `HexahueAlphabet`. `MockAlphabet` (`test/utils/mock-alphabet.ts`)
stays in place for TEST-001's unit tests, where a deterministic double is
still the right choice - it simply stops being used by the e2e layer.

## Decision 2: local e2e tests reuse `docker-compose.yml`'s existing postgres

Confirmed with the user: no new local test-database service. A developer
running `npm run test:e2e` locally is expected to have
`docker compose up postgres` (or the full stack) running already, with
`DATABASE_URL` pointing at it, matching how local development already
works. CI keeps using its own CI-003-provisioned `postgres:16` service
container, unrelated to `docker-compose.yml`.

## Decision 3: `ENCODE_BODY_WITH_UNKNOWN_CHARS` fixture must change

`test/fixtures/api.fixtures.ts`'s `ENCODE_BODY_WITH_UNKNOWN_CHARS` currently
uses `message: 'ABXYZ'`, relying on `MockAlphabet`'s narrow support (only
`A`/`B`) to make `X`/`Y`/`Z` register as unknown characters. The real seeded
Hexahue alphabet (`backend/prisma/seed.ts`) supports the full `A`-`Z`,
`0`-`9`, `.`, `,`, and space - so `X`/`Y`/`Z` are NOT unknown against the
real alphabet, and this test would silently start asserting an empty
`unknownChars` array instead of the intended non-empty one. Preprocessing
uppercases input before lookup (`src/cipher/preprocess.ts:44`), so a
lowercase-letter substitute wouldn't work either - the seeded alphabet has
no punctuation beyond `.`/`,` and no other symbols. **Decided:** change the
fixture to `message: 'AB@#'` (`@` and `#` are not in the seeded set under
any case). `WEAK_ENCODE_BODY` (`pivotBlockSize: 2`) needs no change - it
stays weak against the real alphabet too: `gcd(2, symbolWidth=2) = 2 ≠ 1`
regardless of `symbolHeight`.

## Architecture

- **`backend/test/app.e2e-spec.ts`**: remove the `jest.mock(...)` block and
  the `.overrideProvider(HexahueAlphabet).useValue(new MockAlphabet())` call
  from the `Test.createTestingModule({ imports: [AppModule] })` chain. The
  single existing test (`GET / -> 200 'Hello World!'`) needs no other
  change - it doesn't touch alphabet data at all, so this task is a pure
  verification that the app still boots and responds with the real
  `PrismaService` wired in (this is precisely the check that would have
  caught [[project-prisma-esm-cjs-boot-bug]] had it existed at the time).
- **`backend/test/encode.e2e-spec.ts`**, **`decode.e2e-spec.ts`**,
  **`key.e2e-spec.ts`**: same removal (mock block + override). Each file's
  `beforeAll`/`beforeEach` keeps everything else unchanged - same
  `ValidationPipe` setup, same `app.setGlobalPrefix('api')` where present.
  After the removal, run the full e2e suite against a real seeded database
  and fix whatever concretely breaks - the two known-in-advance breakages
  are documented in Decisions above (the `ENCODE_BODY_WITH_UNKNOWN_CHARS`
  fixture; and PNG/SVG geometry assertions that depend on the real
  alphabet's `symbolWidth: 2, symbolHeight: 3` rather than `MockAlphabet`'s
  `3, 2` - existing assertions look shape/validity-based rather than
  literal-byte, per the task's own read of the spec's wording ("valid
  base64 PNG string", not "this exact PNG"), but this must be verified by
  actually running the suite, not assumed clean.
- **`backend/test/fixtures/api.fixtures.ts`**: `ENCODE_BODY_WITH_UNKNOWN_CHARS.message`
  changes from `'ABXYZ'` to `'AB@#'` per Decision 3. No other fixture needs
  a change (verified: `VALID_ENCODE_BODY`, `VALID_ENCODE_BODY_WITH_KEY`,
  `WEAK_ENCODE_BODY`, `VALID_KEY_STRING`, `MALFORMED_KEY_STRINGS` don't
  depend on `MockAlphabet`-specific behavior).
- **`.github/workflows/ci.yml`**: add an `E2E test` step to the backend job,
  after the existing `Test` step (`npm run test:cov`), running
  `npm run test:e2e`. Reuses the same already-provisioned `postgres` service
  and the `migrate deploy`/`db seed` steps that already run earlier in the
  same job - no new CI infrastructure needed.
- **`backend/package.json`**: `test:e2e` script stays as-is
  (`jest --config ./test/jest-e2e.json`) - no code change needed there. A
  `coverageThreshold` for the "peripheral modules" row (controllers/DTOs) is
  **explicitly out of scope for this plan** - see "Explicitly out of scope"
  below.
- **`docs/tests/api.md`**: remove the stale `> ⚠️ Pending: CI-001 must
  provision...` disclaimer (resolved by CI-003, a differently-scoped/renamed
  item - this file never got updated when that landed). Rewrite the
  isolation-strategy paragraph (lines 9-11) to state the actual, simpler
  reality: the schema is read-only seed data, so no per-test
  transaction/truncation logic is needed or used.

## Discoveries made while verifying this design (before writing a plan)

Rather than write an implementation plan speculating about what "fix whatever
concretely breaks" (Testing strategy, step 3, as originally drafted) might
mean, the migration was actually carried out against a real throwaway
Postgres instance to find out. Two real, concrete bugs surfaced - both fixed,
both verified against the full 71-test e2e suite plus the full 370-test unit
suite:

**Bug 1 - ts-jest doesn't resolve `nodenext`-style `.js`-suffixed relative
imports.** `tsconfig.json` sets `moduleResolution: "nodenext"`, which
requires relative imports in `.ts` source to carry an explicit `.js`
extension (TypeScript then maps it back to the sibling `.ts` file - this is
how the generated Prisma client, e.g. `generated/prisma/client.ts`, imports
`./enums.js`, `./internal/class.js`, etc.). `ts-jest`'s own module
resolution does not perform this mapping by default, producing
`Cannot find module './internal/class.js'` the moment any code path actually
loads the real (non-mocked) generated Prisma client. This was very likely
the actual original reason the `jest.mock('../src/prisma/prisma.service', ...)`
line existed in every e2e spec - not merely test isolation, but working
around an unresolved module-resolution gap. Fixed with a standard
`moduleNameMapper` entry in `backend/test/jest-e2e.json`:
```json
"moduleNameMapper": {
  "^(\\.{1,2}/.*)\\.js$": "$1"
}
```

**Bug 2 - `AlphabetModule` never imports `PrismaModule`, relying entirely on
`AppModule` importing both and `PrismaModule`'s `@Global()` decorator to
paper over the gap.** This works in production (and in `app.e2e-spec.ts`,
which imports the real `AppModule`) because `AppModule` happens to import
`PrismaModule` somewhere in the same tree. But `encode/decode/key.e2e-spec.ts`
each build their own `TestingModule` from `ApiModule` alone (not `AppModule`)
- and `ApiModule` -> `AlphabetModule` never imports `PrismaModule` in that
narrower tree, so `@Global()` has nothing to attach to and
`HexahueAlphabet`'s constructor injection of `PrismaService` fails outright:
`Nest can't resolve dependencies of the HexahueAlphabet (?)`. This is a real
module-composition bug, independent of testing - any future code that
composes `ApiModule` (or `AlphabetModule`) into a context that isn't
`AppModule` would hit the same failure. Fixed by adding `PrismaModule` to
`AlphabetModule`'s own `imports` array (`backend/src/alphabet/alphabet.module.ts`)
- `@Global()` modules are safe to import redundantly (Nest deduplicates), so
this is a pure robustness fix with no behavioral change for the existing
`AppModule`-rooted boot path.

With both fixed, all 71 pre-existing e2e tests and all 370 unit tests pass
unmodified beyond the fixture/assertion changes in Decision 3, plus one
intentional addition: the "multi-word message with spaces" round-trip test
that `docs/tests/api.md` always specified but the suite skipped while
`MockAlphabet` had no space character (Architecture section, decode spec
bullet) - bringing the total to 72. No PNG/SVG-geometry breakage occurred -
the existing assertions were validity/shape-based as predicted, not
literal-byte comparisons that would have broken against the real alphabet's
different `symbolWidth`/`symbolHeight`.

**Post-implementation fix-up (fresh review pass):** an independent review of
this branch's diff found three real gaps invisible until the suite actually
held a live database connection: `app.e2e-spec.ts` had no `afterAll`/`app.close()`
(harmless while `PrismaService` was mocked, a real connection leak once it
wasn't); `PrismaService` never implemented `OnModuleDestroy`/`$disconnect()`,
so even `app.close()` didn't release the Postgres pool; and `jest-e2e.json`
had no `testTimeout` override, leaving Jest's 5s default to cover real
`$connect()` + seeded-alphabet `findMany` work newly added to every spec's
`beforeAll`, a flakiness risk on a step that just became a CI merge gate.
All three fixed (`app.e2e-spec.ts` teardown added; `PrismaService` implements
`OnModuleDestroy`; `jest-e2e.json` sets `testTimeout: 30000`), plus two Minor
polish items (Prettier formatting on the new spaces test; the unknown-chars
assertion tightened from `arrayContaining` to an exact array match).

## Testing strategy

This item's "testing" is the migration itself - there is no test-of-the-test
beyond running the real suite and confirming it's real:

1. Remove the mocks/overrides from all four spec files.
2. Apply the `ENCODE_BODY_WITH_UNKNOWN_CHARS` fixture fix (Decision 3) as
   part of the same change, since the old value is known-broken against the
   real alphabet before ever running anything.
3. Run `npm run test:e2e` locally against a real, migrated, seeded
   `docker-compose.yml` postgres instance. Fix any further concrete failures
   found (expected candidates: PNG/SVG-geometry-dependent assertions, if any
   exist beyond what a first read suggests).
4. Confirm all 41 pre-existing test cases still pass, now for real, plus
   `app.e2e-spec.ts`'s boot check.
5. Add the CI `E2E test` step and verify it would pass in that environment
   (the CI Postgres service uses the same schema/seed process as local, so a
   clean local run is the practical proxy for this - actually triggering a
   CI run happens naturally once this branch's PR is opened).

## Explicitly out of scope for this plan

- **A `coverageThreshold` for the "peripheral modules" 75% row**
  (`docs/tests/index.md`'s middle row: renderer, validation, API
  controllers). This item's job is making the existing e2e suite real, not
  measuring or gating its coverage - that's better done as its own follow-up
  once the real suite's actual coverage numbers are known (today's numbers
  are meaningless, since controllers/DTOs are currently 0%-covered by
  definition - no e2e test has ever actually exercised them for real).
  Revisit this once TEST-002 is merged and a real number exists to threshold
  against.
- **Any change to the mutable-state isolation strategy** beyond documenting
  that none is needed - if a future FEAT ever adds a genuinely mutable
  table, that FEAT's own plan is where transaction/truncation isolation
  gets designed, not retrofitted here speculatively.
- **CI-003 itself** - already `done`, not touched by this plan; this plan
  only adds a step that consumes what CI-003 already provisions.
- **`MockAlphabet`'s removal** - it stays, still used by TEST-001's unit
  tests. Only its use inside the e2e layer goes away.
