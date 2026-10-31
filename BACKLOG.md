# Backlog — HexaRot

## Meta
sync-version: 1
last-updated: 2026-08-05

---

## Items

<!-- ITEM:BEGIN -->
### [CHORE-001] Initialize NestJS backend project

- **type:** chore
- **id:** CHORE-001
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [NestJS project structure, NestJS CLI, TypeScript compiler options, module system]
- **labels:** [chore, domain:infra, priority:critical, milestone:v1]

#### Description

Bootstrap the NestJS backend project using the NestJS CLI. Configure TypeScript strictly
(strict mode, no implicit any). Set up the base module structure matching the planned
architecture: alphabet, cipher, rotation, key, reading-order, renderer, validation, api.

#### Acceptance criteria

- Project created with NestJS CLI
- TypeScript strict mode enabled
- Base module stubs created for each domain (empty modules, no logic yet)
- Project starts without errors (`npm run start:dev`)
- `.env.example` created with documented variables
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-002] Initialize Vue.js 3 frontend project

- **type:** chore
- **id:** CHORE-002
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [Vite build tool, Vue.js 3 project structure, TypeScript with Vue, Pinia setup, vue-i18n setup]
- **labels:** [chore, domain:infra, priority:critical, milestone:v1]

#### Description

Bootstrap the Vue.js 3 frontend project using Vite. Configure TypeScript strictly.
Install and configure Pinia (state management) and vue-i18n (internationalisation
architecture). Create the base view stubs: encode, decode, key.

#### Acceptance criteria

- Project created with Vite + Vue.js 3 + TypeScript template
- Pinia installed and configured
- vue-i18n installed and configured with an `en` locale file (empty strings acceptable)
- Base views created as stubs (no logic)
- Project starts without errors (`npm run dev`)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-003] Configure Docker Compose for local development

- **type:** chore
- **id:** CHORE-003
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-001, CHORE-002
- **learning:** [Docker Compose services, multi-container networking, volume mounts, environment variable injection, health checks]
- **labels:** [chore, domain:infra, priority:critical, milestone:v1]

#### Description

Create a `docker-compose.yml` covering the full local development stack: NestJS backend
(with hot-reload), Vue.js frontend (with hot-reload), PostgreSQL, and a reverse proxy
if needed. Services must communicate over a Docker network. Database credentials are
injected via environment variables.

#### Acceptance criteria

- `docker-compose up` starts all services without errors
- Backend and frontend hot-reload work inside containers
- PostgreSQL service starts with a named volume for data persistence
- Backend can reach PostgreSQL using the service name as hostname
- Frontend can reach the backend API
- No credentials hardcoded in `docker-compose.yml`
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-004] Configure Prisma and PostgreSQL schema — alphabet data model

- **type:** chore
- **id:** CHORE-004
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-003
- **learning:** [Prisma schema definition, Prisma CLI migrations, PostgreSQL data types, seed scripts, relation modelling]
- **labels:** [chore, domain:infra, priority:critical, milestone:v1]

#### Description

Install and configure Prisma. Define the PostgreSQL schema for alphabet reference data.
The schema must represent: an `Alphabet` entity (name, symbol dimensions), a `Symbol`
entity (character, reference to alphabet), and a `ColorCase` entity representing each
individual case in a symbol's colour grid (position x/y, colour value).
Write a seed script that populates the full Hexahue alphabet.

#### Acceptance criteria

- Prisma schema defined and validated (`prisma validate`)
- Migration generated and applied (`prisma migrate dev`)
- Seed script populates the complete Hexahue character set without errors
- Prisma client generated and importable from the backend
- All 26 letters + digits + special characters supported by Hexahue are seeded
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-005] Configure pre-commit hooks with Husky and lint-staged

- **type:** chore
- **id:** CHORE-005
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** CI-001
- **learning:** [Husky git hooks, lint-staged, local CI enforcement]
- **labels:** [chore, domain:infra, priority:high, milestone:v1]

#### Description

Configure Husky and lint-staged to enforce linting locally before each commit.
This mirrors the CI pipeline (CI-001) at the local level, preventing formatting
and lint issues from reaching the remote and causing CI failures or untracked
reformatted files after the fact.

Husky installs a pre-commit hook that runs lint-staged, which executes ESLint
(with --fix) on staged files only — backend TypeScript files and frontend
Vue/TypeScript files.

#### Acceptance criteria

- Husky installed and configured at the root level
- lint-staged configured for backend (*.ts) and frontend (*.vue, *.ts)
- Pre-commit hook runs automatically on git commit
- Linting errors block the commit
- Auto-fixable issues are fixed and re-staged automatically
- Hook runs only on staged files (not the entire codebase)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CI-001] Set up GitHub Actions CI pipeline

- **type:** ci
- **id:** CI-001
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-001, CHORE-002
- **learning:** [GitHub Actions workflow syntax, job parallelism, caching node_modules, matrix strategy]
- **labels:** [ci, domain:infra, priority:high, milestone:v1]

#### Description

Create a CI workflow that runs on every pull request to `main`. The workflow runs
backend tests (Jest) and frontend tests (Vitest) in parallel jobs. Lint is also
checked. The workflow must use caching to keep run times reasonable.

#### Acceptance criteria

- Workflow triggers on pull_request targeting `main`
- Backend job: install, lint, test
- Frontend job: install, lint, test
- Jobs run in parallel
- `node_modules` cached between runs
- Workflow passes on a clean project (no tests yet = 0 failing tests)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CI-002] Set up backlog sync pipeline — backlog.md to GitHub Issues and Project

- **type:** ci
- **id:** CI-002
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** XL
- **parent:** ~
- **depends-on:** CI-001
- **learning:** [GitHub Actions workflow_dispatch, GitHub REST API via octokit, GitHub Projects v2 GraphQL API, idempotent scripting patterns]
- **labels:** [ci, domain:infra, priority:high, milestone:v1]

#### Description

Create a GitHub Actions workflow that parses `backlog.md` and synchronises its content
to GitHub Issues and the GitHub Project (Kanban). The workflow triggers on push to
`main` (when `backlog.md` is modified) and on `workflow_dispatch`.

Sync logic:
- Parse items delimited by `<!-- ITEM:BEGIN -->` / `<!-- ITEM:END -->`
- Validate all fields before any write operation (see validation rules in architecture
  spec). Abort with a descriptive log on structural or coherence errors. Emit warnings
  for non-blocking issues.
- Look up existing issues via the `<!-- backlog-id: ID -->` marker in issue body
- Create issue if not found; update if found and content differs
- Log conflicts when GitHub-side fields were modified directly (backlog.md wins)
- Assign labels (create labels on GitHub if missing)
- Assign milestone (create milestone if missing)
- Place issue in the correct Kanban column matching `status`
- Add `group:<parent-id>` label automatically when `parent` is set
- Close issue with label `status:removed` when item is removed from backlog

#### Acceptance criteria

- Workflow runs without errors on a clean repo
- Creating a new item in backlog.md and pushing to main creates a corresponding issue
- Modifying an item updates the issue without creating a duplicate
- Removing an item closes the issue with `status:removed`
- Conflict between GitHub-side edit and backlog.md is logged; backlog.md wins
- Invalid backlog (missing field, bad value, unknown dependency ID) aborts sync with
  a clear error message referencing the offending item ID
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CI-003] Add PostgreSQL service to CI pipeline for integration tests

- **type:** ci
- **id:** CI-003
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** CI-001
- **learning:** [GitHub Actions services, Docker service containers in CI, environment variable injection in GitHub Actions, database seeding in CI pipelines]
- **labels:** [ci, domain:infra, priority:high, milestone:v1]

#### Description

Amend the CI workflow to support integration tests that require a live PostgreSQL
database. The backend job must declare a `services:` block with a PostgreSQL container,
inject the `DATABASE_URL` environment variable, wait for the service to be healthy,
run Prisma migrations, and execute the database seed before running tests.

This unblocks TEST-002 (API integration tests) in CI.

#### Acceptance criteria

- CI backend job declares a `services:` block with a PostgreSQL image
- `DATABASE_URL` is injected as an environment variable in the backend job
- Job waits for PostgreSQL to be healthy before running any commands
- Prisma migrations are applied before tests run
- Seed script runs successfully before tests run
- The configuration allows future integration tests to access PostgreSQL without further modifications to the workflow
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-001] VisualAlphabet interface and Hexahue implementation

- **type:** feat
- **id:** FEAT-001
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** alphabet
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-004
- **learning:** [TypeScript interfaces vs abstract classes, strategy pattern, dependency injection in NestJS]
- **labels:** [feat, domain:alphabet, priority:critical, milestone:v1]

#### Description

Define the `VisualAlphabet` interface. Implement `HexahueAlphabet` as its first concrete
class, backed by the PostgreSQL alphabet data seeded in CHORE-004. The interface exposes:
- `getBlock(char: string): ColorGrid` — returns the 2×3 colour grid for a character
- `getSupportedChars(): string[]` — returns all characters the alphabet can encode

`ColorGrid` is a typed 2D structure (2 columns × 3 rows) where each cell holds a colour
value from the Hexahue palette.

#### Acceptance criteria

- `VisualAlphabet` interface defined in the `shared/types` module
- `HexahueAlphabet` implements `VisualAlphabet` and loads data from the database
- `getBlock` throws a typed error for unsupported characters
- `getSupportedChars` returns the complete Hexahue character set
- Unit tests cover all supported characters, an unsupported character, and
  verify grid dimensions (2 columns × 3 rows)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-002] Text pre-processing — uppercase, transliteration, unknown character reporting

- **type:** feat
- **id:** FEAT-002
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** cipher
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-001
- **learning:** [Unicode NFD normalisation, diacritic stripping, pure functions in TypeScript, error accumulation pattern]
- **labels:** [feat, domain:cipher, priority:critical, milestone:v1]

#### Description

Implement the text pre-processing pipeline as a pure function with no side effects:
1. Convert input to uppercase
2. Apply transliteration via NFD decomposition and diacritic stripping (é→E, à→A, ç→C,
   full Latin coverage)
3. Collect characters that remain outside the Hexahue alphabet after transliteration —
   return them alongside the processed string, do not drop them silently

The function signature should be:
`preprocess(input: string, alphabet: VisualAlphabet): PreprocessResult`
where `PreprocessResult` contains the processed string and an array of unknown characters.

#### Acceptance criteria

- Input is uppercased before any other step
- Full Latin diacritic coverage (at minimum: French, Spanish, German, Portuguese)
- Unknown characters are collected and returned, not silently dropped
- Function is pure and deterministic
- Unit tests cover: basic uppercase, accented characters, mixed known/unknown input,
  empty string, string with only unknown characters
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-003] Parameter validation — GCD computation and weakness warning

- **type:** feat
- **id:** FEAT-003
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** validation
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-001
- **learning:** [Euclidean GCD algorithm, TypeScript discriminated unions for result types]
- **labels:** [feat, domain:validation, priority:high, milestone:v1]

#### Description

Implement the parameter validator. Given a pivot block size T and a `VisualAlphabet`,
compute `GCD(T, symbolWidth)` and `GCD(T, symbolHeight)`. If either result is not 1,
the configuration weakens the cryptogram (rotations may preserve partial symbol
alignment). Return a typed validation result that distinguishes:
- `valid` — GCD is 1 for both dimensions
- `weak` — GCD is not 1 for at least one dimension, with a human-readable explanation
- `overridden` — user explicitly bypassed the warning

The validator does not block execution — it informs.

#### Acceptance criteria

- GCD computation is correct for all tested inputs
- Warning is produced for T=2 (GCD with symbolWidth=2 is 2, not 1)
- Warning is produced for T=3 (GCD with symbolHeight=3 is 3, not 1)
- T=5 passes without warning (GCD(5,2)=1, GCD(5,3)=1)
- Override flag suppresses the warning in the result
- Unit tests cover: valid T, T sharing factor with width, T sharing factor with height,
  T sharing factor with both, override flag
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-004] Key generation and base36 encoding

- **type:** feat
- **id:** FEAT-004
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** key
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-003
- **learning:** [base36 encoding/decoding, bitwise packing, TypeScript branded types, immutable value objects]
- **labels:** [feat, domain:key, priority:critical, milestone:v1]

#### Description

Implement the `KeyCodec` module. A key encapsulates: system version, pivot block size,
rotation sequence (one of 4! = 24 permutations of [0°, 90°, 180°, 270°]), rotation
direction (clockwise / counter-clockwise), and reading order.

The key is encoded as a compact base36 string prefixed with `HR` (e.g. `HR1·2T51`).
The codec must expose:
- `encode(params: KeyParams): string` — serialises parameters to a key string
- `decode(key: string): KeyParams` — deserialises a key string to parameters
- `validate(key: string): boolean` — checks structural validity without full decode

#### Acceptance criteria

- Round-trip: `decode(encode(params))` returns params equal to the original
- All 24 rotation sequence permutations are encodable and decodable correctly
- Both rotation directions are encoded
- All V1 reading orders are encoded
- `validate` returns false for a malformed or truncated key string
- `validate` returns false for a key with an unknown version prefix
- Unit tests cover round-trip for all reading orders and a representative subset of
  rotation sequences
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-005] Reading order strategies — V1 directions and alternate mode

- **type:** feat
- **id:** FEAT-005
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** reading-order
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-004
- **learning:** [strategy pattern in TypeScript, 2D coordinate generation, generator functions]
- **labels:** [feat, domain:reading-order, priority:high, milestone:v1]

#### Description

Implement the `ReadingOrderStrategy` interface and its four V1 concrete strategies:
LR-TB, RL-TB, TB-LR, BT-LR. Each strategy takes grid dimensions (in blocks) and
returns an ordered sequence of block coordinates `{x, y}[]`.

Additionally implement the `alternate` modifier: when active, the traversal direction
reverses at each new row (for LR-TB / RL-TB) or column (for TB-LR / BT-LR).

Padding blocks are always placed at the end of the sequence — the strategy determines
where "end" is.

#### Acceptance criteria

- All four strategies produce the correct sequence for a 3×3 block grid
- Alternate modifier correctly reverses direction on odd rows/columns
- All strategies cover every block exactly once (no duplicate, no omission)
- Padding blocks appear at the end of the sequence for all strategies and
  alternate variants
- Unit tests cover all four base strategies, all four with alternate, and
  edge cases (1×N and N×1 grids)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-006] Grid construction — symbol layout and random padding

- **type:** feat
- **id:** FEAT-006
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** cipher
- **complexity:** L
- **parent:** ~
- **depends-on:** FEAT-002, FEAT-005
- **learning:** [2D array construction in TypeScript, modular arithmetic, seeded random vs Math.random, TypeScript generics with 2D structures]
- **labels:** [feat, domain:cipher, priority:critical, milestone:v1]

#### Description

Implement grid construction. Given a pre-processed string, a `VisualAlphabet`, and a
pivot block size T:
1. Determine N (symbols per row) such that N × symbolWidth is a multiple of T
2. Lay out symbols row by row to fill the grid width
3. Compute the required grid height in cases: ceiling to the nearest multiple of T
4. Fill remaining cases with random colour padding from the Hexahue palette

The output is a typed 2D grid of colour cases, ready for the rotation step.

#### Acceptance criteria

- Grid width in cases is always a multiple of T
- Grid height in cases is always a multiple of T
- All message symbols appear in the grid in reading order
- Padding occupies only the trailing positions
- Padding colours are random (not deterministic) but always valid Hexahue palette values
- Unit tests cover: message that fills the grid exactly, message requiring padding,
  various values of T (5, 6, 7), empty message
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-007] Block rotation engine

- **type:** feat
- **id:** FEAT-007
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** rotation
- **complexity:** L
- **parent:** ~
- **depends-on:** FEAT-005, FEAT-006
- **learning:** [2D matrix rotation algorithms, modular indexing, immutable data transformation, TypeScript tuple types]
- **labels:** [feat, domain:rotation, priority:critical, milestone:v1]

#### Description

Implement the block rotation engine. The grid is divided into T×T pivot blocks.
Blocks are traversed in the order defined by the `ReadingOrderStrategy`. A rotation
is applied to each block according to the current position in the rotation sequence
(cycling through the sequence if there are more blocks than sequence entries).

Rotations operate on individual colour cases (not symbols). Supported rotations:
0°, 90°, 180°, 270° — in the direction specified by the key (clockwise or
counter-clockwise).

The engine must also support the inverse operation (for decoding).

#### Acceptance criteria

- A 0° rotation leaves the block unchanged
- A 90° clockwise rotation produces the correct output for a known T×T block
- Applying the inverse sequence to an encoded grid returns the original grid
- Rotation direction (CW vs CCW) is correctly applied
- Rotation sequence cycles correctly when there are more blocks than sequence entries
- Unit tests cover all four rotation angles, both directions, sequence cycling,
  and round-trip (encode then decode) for a full grid
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-008] Cryptogram metadata header

- **type:** feat
- **id:** FEAT-008
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** cipher
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-006
- **learning:** [binary header design, buffer encoding in Node.js, separation of concerns between key and message metadata]
- **labels:** [feat, domain:cipher, priority:high, milestone:v1]

#### Description

Design and implement the metadata header embedded in the cryptogram. The header stores
the message length (character count), allowing the decoder to know where the message
ends and padding begins. The header must not store the key — the key is provided
separately at decode time.

Define the header format (byte layout or visual row), the encoding method, and
implement `encodeHeader` and `decodeHeader` functions.

#### Acceptance criteria

- Header encodes message length without ambiguity
- Header is self-contained and does not reference the key
- `decodeHeader(encodeHeader(n)) === n` for any valid message length
- Header format is documented (byte layout or visual encoding described in code)
- Unit tests cover: minimum length (1), typical length, maximum supported length
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-009] PNG renderer

- **type:** feat
- **id:** FEAT-009
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** renderer
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-007
- **learning:** [Sharp library API, pixel buffer construction, image dimensions and DPI, colour space handling in Sharp]
- **labels:** [feat, domain:renderer, priority:critical, milestone:v1]

#### Description

Implement `PngRenderer`, a concrete implementation of the `Renderer` interface, using
Sharp. The renderer takes a fully rotated colour grid, a case size option (small /
medium / large), and outputs a PNG binary buffer.

Case sizes in pixels (to be confirmed, suggested values):
- small: 8px per case
- medium: 16px per case
- large: 32px per case

The Hexahue standard colour palette is used. No metadata header is rendered - the
encoded grid is the pre-processed message plus random padding only (see
docs/tests/renderer.md, "Design note: no visual header row").

#### Acceptance criteria

- Output is a valid PNG binary buffer
- All three case sizes produce images with correct pixel dimensions
- Colours match the Hexahue standard palette values exactly
- Renderer implements the `Renderer` interface
- Integration test: encode a known short message, render to PNG, verify output
  dimensions match expected values
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-010] SVG renderer

- **type:** feat
- **id:** FEAT-010
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** renderer
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-007
- **learning:** [SVG coordinate system, SVG rect elements, native string-based SVG generation without DOM, SVG viewBox]
- **labels:** [feat, domain:renderer, priority:critical, milestone:v1]

#### Description

Implement `SvgRenderer`, a concrete implementation of the `Renderer` interface, using
native SVG string generation (no DOM library). The renderer takes a fully rotated colour
grid, a case size option, and outputs an SVG string.

The SVG must be well-formed, self-contained, and renderable in a browser without
additional assets. Case sizes follow the same pixel values as the PNG renderer. No
metadata header is rendered (see docs/tests/renderer.md, "Design note: no visual
header row").

#### Acceptance criteria

- Output is a valid, well-formed SVG string
- SVG is self-contained (no external references)
- All three case sizes produce SVG with correct viewBox dimensions
- Colours match the Hexahue standard palette values exactly
- Renderer implements the `Renderer` interface
- Integration test: encode a known short message, render to SVG, verify viewBox
  dimensions and presence of correct number of `<rect>` elements
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-011] Encode API endpoint

- **type:** feat
- **id:** FEAT-011
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** api
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-009, FEAT-010
- **learning:** [NestJS controllers and decorators, DTO validation with class-validator, NestJS pipes, binary response handling in NestJS, multipart response or JSON+base64 strategy]
- **labels:** [feat, domain:api, priority:critical, milestone:v1]

#### Description

Implement the `POST /encode` endpoint. The endpoint accepts a message and encoding
parameters (or a pre-built key), validates inputs, runs the full encoding pipeline,
and returns both PNG and SVG outputs.

Request body:
- `message: string` — the plaintext message
- `key?: string` — a pre-built HR key (if provided, individual params are ignored)
- `pivotBlockSize?: number`
- `rotationSequence?: number[]` — indices into [0°, 90°, 180°, 270°]
- `rotationDirection?: 'cw' | 'ccw'`
- `readingOrder?: string`
- `size?: 'small' | 'medium' | 'large'`
- `overrideWeaknessWarning?: boolean`

Response:
- `png: string` — base64-encoded PNG
- `svg: string` — SVG string
- `key: string` — the HR key used (generated or echoed)
- `warnings: string[]` — any weakness warnings
- `unknownChars: string[]` — characters that could not be encoded

#### Acceptance criteria

- Endpoint is reachable and returns 200 with valid outputs for a well-formed request
- Key is generated from individual params if not provided
- Weakness warning is included in response when applicable, does not block encoding
- Unknown characters are reported and excluded from encoding
- Invalid input (missing message, malformed key) returns 400 with a descriptive error
- DTO validation rejects extra fields
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-012] Decode API endpoint

- **type:** feat
- **id:** FEAT-012
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** api
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-011
- **learning:** [image parsing with Sharp, base64 decoding in Node.js, SVG parsing strategies]
- **labels:** [feat, domain:api, priority:critical, milestone:v1]

#### Description

Implement the `POST /decode` endpoint. The endpoint accepts a cryptogram (PNG or SVG)
and a key, applies inverse rotations, and returns the decoded plaintext. There is no
metadata header to determine message length (see docs/tests/renderer.md, "Design
note: no visual header row") - message-boundary detection (message vs. random
padding) was resolved as: decode everything unconditionally, `?` placeholder for
unrecognized blocks, no truncation (see
docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md, "Decision 2").

Request body:
- `cryptogram: string` — base64-encoded PNG or SVG string
- `format: 'png' | 'svg'`
- `key: string` — the HR key
- `size: 'small' | 'medium' | 'large'`

Response:
- `message: string` — the decoded plaintext

#### Acceptance criteria

- Endpoint correctly decodes a cryptogram produced by the encode endpoint
- Round-trip test: encode a message, decode the output, verify original message is
  recovered (meaning the decoded output starts with the original message, a prefix
  match, not exact equality - see Decision 2 in the design spec above)
- Malformed key returns 400 with a descriptive error
- Malformed cryptogram returns 400 with a descriptive error
- Missing required fields return 400
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-013] Key generation API endpoint

- **type:** feat
- **id:** FEAT-013
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** api
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-004
- **learning:** [REST resource design, NestJS query params vs body, OpenAPI decorators in NestJS]
- **labels:** [feat, domain:api, priority:medium, milestone:v1]

#### Description

Implement the `POST /key/generate` endpoint. Accepts optional parameters (pivot block
size, rotation sequence, rotation direction, reading order) and returns a generated HR
key string. If no parameters are provided, sensible defaults are used.

Also implement `GET /key/parse?key=HR...` which parses a key string and returns its
decoded parameters as a structured object.

#### Acceptance criteria

- `POST /key/generate` returns a valid HR key string for any combination of valid params
- `POST /key/generate` with no body returns a key with default parameters
- `GET /key/parse` returns all parameters for a valid key
- `GET /key/parse` returns 400 for a malformed key string
- Generated key round-trips through parse without data loss
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-014] Frontend — encode view

- **type:** feat
- **id:** FEAT-014
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** frontend
- **complexity:** L
- **parent:** ~
- **depends-on:** FEAT-011
- **learning:** [Vue.js 3 composition API, reactive forms without a form library, Pinia store design, async API calls with fetch/axios in Vue, blob download from base64]
- **labels:** [feat, domain:frontend, priority:critical, milestone:v1]

#### Description

Implement the encode view. The user enters a message, configures encoding parameters
(or pastes an existing key), and submits. The view displays:
- The generated cryptogram (PNG preview and SVG preview)
- The HR key used
- Any weakness warnings
- Any unknown characters reported

The user can download the PNG and/or SVG output. All UI strings are routed through
vue-i18n keys (English only in V1, keys must be structured for future French addition).

#### Acceptance criteria

- User can enter a message and trigger encoding
- All encoding parameters are configurable from the UI
- PNG and SVG previews are displayed after successful encoding
- HR key is displayed and copyable
- Weakness warnings are displayed prominently (not hidden)
- Unknown characters are listed with a clear explanation
- PNG and SVG are downloadable
- All visible strings use i18n keys
- Loading state is shown during API call
- API error is shown to the user (not silently swallowed)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-015] Frontend — decode view

- **type:** feat
- **id:** FEAT-015
- **milestone:** v1
- **status:** done
- **priority:** critical
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-012
- **learning:** [file upload handling in Vue.js, FileReader API, drag-and-drop upload, conditional rendering in Vue]
- **labels:** [feat, domain:frontend, priority:critical, milestone:v1]

#### Description

Implement the decode view. The user uploads a cryptogram (PNG or SVG file) and enters
an HR key. The view displays the decoded plaintext. File upload supports both click-to-
browse and drag-and-drop.

All UI strings are routed through vue-i18n keys.

#### Acceptance criteria

- User can upload a PNG or SVG file (click or drag-and-drop)
- User can enter an HR key
- Decoded message is displayed after successful decoding
- Invalid key format is caught client-side before API call with a clear error message
- API error (malformed cryptogram, wrong key) is shown to the user
- Loading state is shown during API call
- All visible strings use i18n keys

#### Resolution (2026-08-22)

Already implemented - status was stale. `DecodeView.vue`, `DecodeParamsForm.vue`,
and `DecodeUploadArea.vue` (`frontend/src/views/`, `frontend/src/components/`)
cover every acceptance criterion: click and drag-and-drop upload, HR key input with
client-side format validation before the API call, decoded message display, API
error handling, loading state, and full i18n coverage. 46 tests across
`DecodeView.spec.ts`, `DecodeUploadArea.spec.ts`, and `decode.spec.ts` (store) all
pass. No code change needed - this item corrects the tracking only.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-016] Frontend — key view

- **type:** feat
- **id:** FEAT-016
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-013
- **learning:** [clipboard API in browsers, Vue.js computed properties, form validation UX patterns]
- **labels:** [feat, domain:frontend, priority:medium, milestone:v1]

#### Description

Implement the key view with two sections:
1. **Key generator** — the user configures parameters and generates an HR key. The key
   is displayed and copyable to clipboard.
2. **Key parser** — the user pastes an HR key and sees its decoded parameters displayed
   in a human-readable format.

All UI strings are routed through vue-i18n keys.

#### Acceptance criteria

- Key generator produces and displays a valid HR key for any valid parameter combination
- Copy to clipboard works and provides visual feedback (button state change or toast)
- Key parser displays all parameters for a valid key
- Key parser displays a clear error for a malformed key
- All visible strings use i18n keys
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [TEST-004] Shared MockAlphabet for contract testing

- **type:** test
- **id:** TEST-004
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** alphabet
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-001
- **learning:** [test doubles vocabulary (stub vs mock vs fake), interface contract testing in TypeScript, shared test fixtures]
- **labels:** [test, domain:alphabet, priority:high, milestone:v1]

#### Description

Implement a `MockAlphabet` — a minimal, self-contained implementation of `VisualAlphabet`
intended exclusively for use in tests. It must be defined independently of `HexahueAlphabet`
and must use deliberately different symbol dimensions (e.g. 3×2 instead of Hexahue's 2×3)
to ensure that tests exercising the `VisualAlphabet` contract are not accidentally coupled
to Hexahue-specific dimensions.

`MockAlphabet` must be placed in a shared test utilities module, importable by any test
suite in the backend. It supports a small, fixed character set (e.g. A–F) with hardcoded
colour grids.

This item also formalises the `symbolWidth` and `symbolHeight` properties as required
members of the `VisualAlphabet` interface, so that consumers (validator, grid constructor)
can query dimensions without knowing the concrete implementation.

#### Acceptance criteria

- `MockAlphabet` implements `VisualAlphabet` fully
- Symbol dimensions differ from Hexahue (width ≠ 2 or height ≠ 3)
- `symbolWidth` and `symbolHeight` are exposed as required properties on `VisualAlphabet`
- `MockAlphabet` is importable from a shared test utilities path (e.g. `test/utils/mock-alphabet`)
- `HexahueAlphabet` exposes `symbolWidth: 2` and `symbolHeight: 3` in conformance with
  the updated interface
- At least one existing test (FEAT-001 unit tests) is updated to use `MockAlphabet`
  for contract-level assertions, separate from Hexahue-specific assertions
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [TEST-001] Backend unit test suite — cipher and key modules

- **type:** test
- **id:** TEST-001
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** cipher
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-002, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-008
- **learning:** [Jest test structure, describe/it/expect patterns, test coverage configuration in Jest, mocking dependencies in NestJS tests]
- **labels:** [test, domain:cipher, priority:high, milestone:v1]

#### Description

Write and consolidate the full Jest unit test suite for the core algorithmic modules:
pre-processing, grid construction, rotation engine, key codec, and metadata header.
Configure Jest coverage thresholds: a high threshold (to be confirmed by QA thread) on
these modules. Tests must be deterministic and isolated (no database, no filesystem).

#### Acceptance criteria

- All unit tests for cipher, key, rotation, and header modules pass
- Coverage on these modules meets the high threshold defined by the QA thread
- No test relies on database access or external I/O
- Test run completes in under 30 seconds
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [TEST-002] Backend integration test suite — API endpoints

- **type:** test
- **id:** TEST-002
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** api
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-011, FEAT-012, FEAT-013, TEST-001, CI-003
- **learning:** [NestJS testing module, supertest for HTTP integration tests, test database setup and teardown, fixture patterns]
- **labels:** [test, domain:api, priority:high, milestone:v1]

#### Description

Write integration tests for all API endpoints using the NestJS testing module and
supertest. Tests cover happy paths, validation errors, and round-trip correctness
(encode → decode recovers original message).

#### Acceptance criteria

- Encode endpoint: happy path, missing message, malformed key, weakness warning case
- Decode endpoint: round-trip test, malformed key, malformed cryptogram
- Key endpoints: generate with params, generate with defaults, parse valid key,
  parse malformed key
- All tests pass against a real test database (seeded Hexahue alphabet)
- Tests clean up after themselves (no state leakage between test runs)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [TEST-003] Frontend unit test suite — Vitest

- **type:** test
- **id:** TEST-003
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-014, FEAT-015, FEAT-016
- **learning:** [Vitest configuration, Vue Test Utils, component testing patterns, mocking fetch/axios in Vitest]
- **labels:** [test, domain:frontend, priority:medium, milestone:v1]

#### Description

Write Vitest unit tests for the frontend components and Pinia stores. Tests cover
component rendering, user interactions (form input, button clicks), store state
transitions, and API call mocking.

#### Acceptance criteria

- Encode view: form submission triggers API call with correct payload, results are
  displayed, errors are shown
- Decode view: file upload is handled, API call is triggered, result is displayed
- Key view: key generation and parsing flows work correctly
- All Pinia stores have tests for their main actions and state transitions
- Coverage meets the global threshold defined by the QA thread
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [DOCS-001] README.md and README.fr.md

- **type:** docs
- **id:** DOCS-001
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** docs
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-011, FEAT-012, FEAT-013
- **learning:** [Markdown documentation conventions, documenting REST APIs without OpenAPI, bilingual documentation maintenance]
- **labels:** [docs, domain:docs, priority:medium, milestone:v1]

#### Description

Write `README.md` (English) and `README.fr.md` (French). Each file must include:
- Project description
- Quick start (Docker Compose)
- API usage examples (encode, decode, key generation)
- Key format documentation
- Cipher system overview (non-technical)
- Cross-link to the other language version at the top

#### Acceptance criteria

- Both files exist and are cross-linked at the top
- Quick start instructions are tested and work on a clean clone
- API examples use real, working request/response samples
- No placeholder content in the published version
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-017] Animated decoding mode

- **type:** feat
- **id:** FEAT-017
- **milestone:** v2
- **status:** ready
- **priority:** medium
- **domain:** frontend
- **complexity:** XL
- **parent:** ~
- **depends-on:** FEAT-015
- **learning:** [CSS/JS animation sequencing, Vue.js transition system, step-by-step algorithm visualisation]
- **labels:** [feat, domain:frontend, priority:medium, milestone:v2]

#### Description

Implement an animated decoding mode in the frontend. The animation visually decomposes
the inverse rotation process block by block, allowing the user to see how the
cryptogram is progressively resolved back to its original state.

#### Acceptance criteria

- Animation plays automatically after decoding is triggered
- Each block rotation is shown individually in sequence
- Animation speed is configurable (slow / normal / fast)
- Animation can be paused and stepped manually
- Final state matches the decoded cryptogram
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-018] Correlation score

- **type:** feat
- **id:** FEAT-018
- **milestone:** v2
- **status:** done
- **priority:** low
- **domain:** cipher
- **complexity:** XL
- **parent:** ~
- **depends-on:** FEAT-007
- **learning:** [statistical correlation measures, image analysis concepts, algorithm design for visual entropy measurement]
- **labels:** [feat, domain:cipher, priority:low, milestone:v2]

#### Description

Implement a correlation score that measures residual detectability of a cryptogram —
i.e. how much of the original symbol structure remains visually detectable after
rotation. A lower score indicates a more effective cryptogram.

The score is exposed via a dedicated API endpoint and optionally displayed in the
encode view.

#### Acceptance criteria

- Score is a normalised value between 0 and 1
- Score of 0 means no detectable structure; 1 means fully readable
- Score is deterministic for a given cryptogram
- Endpoint documented in API docs
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-019] Spiral reading order

- **type:** feat
- **id:** FEAT-019
- **milestone:** v2
- **status:** ready
- **priority:** low
- **domain:** reading-order
- **complexity:** L
- **parent:** ~
- **depends-on:** FEAT-005
- **learning:** [spiral traversal algorithms, edge-inward coordinate generation, clockwise vs counter-clockwise spiral]
- **labels:** [feat, domain:reading-order, priority:low, milestone:v2]

#### Description

Implement spiral reading order as a new `ReadingOrderStrategy`. Two variants: edge-to-
centre and centre-to-edge. The spiral strategy must integrate with the existing key
encoding (new reading order values in the key codec).

#### Acceptance criteria

- Spiral traversal covers every block exactly once
- Both edge-to-centre and centre-to-edge variants are implemented
- Strategy integrates with the key codec (new encoded values, backwards compatible)
- Unit tests cover both variants for square and non-square grids
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-020] French interface (i18n)

- **type:** feat
- **id:** FEAT-020
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-014, FEAT-015, FEAT-016
- **learning:** [vue-i18n locale switching, pluralisation rules in i18n, maintaining parallel translation files]
- **labels:** [feat, domain:frontend, priority:medium, milestone:v2]

#### Description

Add the French locale to the vue-i18n configuration. All UI strings already use i18n
keys (enforced in V1 features) — this item consists solely of filling in the French
translation file and implementing the language switcher in the UI.

#### Acceptance criteria

- All UI strings have French translations
- Language switcher is accessible from all views
- Switching language does not reload the page
- No English strings remain visible when French locale is active

#### Resolution (2026-10-31)

- Locale choice (`frontend/src/i18n/locale.ts`): the saved choice in
  `localStorage` (`hexarot_locale`) wins, then the first supported browser
  language (`fr-*` gives French), then English. `<html lang>` follows the
  active locale.
- `LanguageSwitcher` in `AppLayout`, on every view including the public ones:
  a single button showing the other language in that language ("Français" /
  "English"), with `lang` and an accessible name in the target language.
  Switching does not reload or navigate.
- `frontend/src/locales/fr.json` covers every key; `locales.spec.ts` fails CI
  if a key or a named parameter differs from `en.json`.
- Admin users view: role, verified and active flags go through i18n, the
  creation date is formatted for the active locale (in the viewer's
  timezone). Network and unexpected errors now show the translated
  `errors.*` message, like the other views, instead of an English string
  written by the store.
- The nav bar now wraps on narrow screens: the extra switcher pushed it past a
  390px viewport (398px in English, 468px in French).

Out of scope, still in English in the French interface: backend error
messages shown through `{detail}` and backend weakness warnings (both sent by
the API as English text), and the verification email. See FEAT-024.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-021] User authentication — registration with email confirmation, token issuance and validation

- **type:** feat
- **id:** FEAT-021
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** api
- **complexity:** XL
- **parent:** ~
- **depends-on:** CHORE-004
- **learning:** [JWT token design, token expiry and refresh strategies, NestJS Guards, bcrypt password hashing, RGPD considerations for user data, transactional email via SMTP relay, single-use token hashing]
- **labels:** [feat, domain:api, priority:medium, milestone:v2]

#### Description

Implement user registration and token-based authentication, gated by email confirmation.
A user registers with an email and password. The account is created with
`emailVerified: false` and cannot log in until the address is confirmed.

A single-use verification token is generated, stored hashed (never in plaintext) with a
24-hour expiry in a dedicated `VerificationToken` table, and emailed to the user via a
`MailerService` abstraction. The production implementation sends through Brevo's SMTP
relay (`smtp-relay.brevo.com:587`), following the same pattern already in production on
GeoChallenge-Tracker and HiveMind. A no-op implementation is used in tests, exposing the
last-sent token for assertions instead of sending real mail.

The email contains a link to a frontend confirmation page
(`{FRONTEND_BASE_URL}/verify-email?token=...`). Visiting it calls the verification
endpoint, which marks the account as verified. Because login is blocked until then, a
rate-limited resend endpoint is required so a user who loses or lets the link expire can
recover without contacting support.

On successful login, a time-limited JWT token is issued. Protected API endpoints
validate the token via a NestJS Guard. Token lifetime and refresh strategy to be defined
at implementation time.

#### Acceptance criteria

- User can register with email + password; account is created with `emailVerified: false`
- Password is hashed (bcrypt), never stored in plaintext
- Registration rejects duplicate email addresses
- A verification token is generated, stored hashed (not plaintext) with a 24-hour expiry
- `MailerService` interface has an SMTP implementation (Brevo relay config: host, port,
  user, password, from address, frontend base URL) and a no-op test implementation
- Confirmation endpoint marks the account verified and invalidates the token (single use)
- Confirmation endpoint rejects an unknown, expired, or already-used token with a
  descriptive 400 error
- Resend-verification endpoint is rate-limited and does not reveal whether an email
  address is registered (same response for existing and non-existing accounts)
- Login is rejected with 401 for an unverified account, with a message distinguishable
  from "wrong password"
- Login returns a JWT with a defined expiry for a verified account
- Protected endpoints reject requests without a valid token
- Expired JWTs are rejected with a 401 response
- `.env.example` documents `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
  `FRONTEND_BASE_URL`
- All routes except the four authentication endpoints (`POST /auth/register`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`) and `GET /` (pre-existing liveness check) require a valid JWT by default, including `encode`/`decode`/`key` routes
- A `Role` enum (`USER`, `ADMIN`) exists
- Exactly one admin account is seeded from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, with no promotion endpoint
- `GET /admin/users`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id` exist, are admin-only, and block self-deactivation/self-deletion
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-006] Traefik-based local development environment — dev/prod parity

- **type:** chore
- **id:** CHORE-006
- **milestone:** v1
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-003
- **learning:** [Traefik dynamic Docker provider, label-based routing, path-prefix stripping, Docker external networks, local DNS resolution for .local domains]
- **labels:** [chore, domain:infra, priority:high, milestone:v1]

#### Description

Reconfigure `docker-compose.yml` so local development is routed through Traefik instead
of publishing container ports directly, mirroring the topology used in production. The
backend and frontend containers join an external `traefik-public` network (provided by
the existing local Traefik reverse proxy) plus an internal network for
service-to-service traffic. Routing labels expose the stack at
`hexarot.marvinlerouge.local`: the frontend on `/`, the backend API on `/api` with the
prefix stripped before it reaches NestJS, both on the `web` entrypoint (no TLS locally).

Direct host port publication for `backend` (3000) and `frontend` (5173) is removed.
PostgreSQL keeps a `127.0.0.1`-bound port for local tooling (Prisma Studio, direct
psql access) — it is not routed through Traefik.

#### Acceptance criteria

- `docker-compose up` starts the stack without publishing backend/frontend ports directly
- Frontend is reachable at `http://hexarot.marvinlerouge.local` once the host resolves
  that name (documented, not automated) and the local Traefik proxy is running
- Backend API is reachable at `http://hexarot.marvinlerouge.local/api/...` with the
  `/api` prefix stripped before reaching NestJS routes
- `backend` and `frontend` join `traefik-public` (external) and an `internal` network;
  `postgres` stays on `internal` only
- `docker-compose.yml` contains no hardcoded credentials
- `CONTRIBUTING.md` documents the prerequisite: local Traefik proxy running and
  `hexarot.marvinlerouge.local` resolving to `127.0.0.1` (`/etc/hosts` entry)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-007] Production Dockerfiles and docker-compose.prod.yml

- **type:** chore
- **id:** CHORE-007
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-006
- **learning:** [multi-stage Docker builds, production vs dev build targets, Traefik TLS via Let's Encrypt certresolver, container image tagging strategy]
- **labels:** [chore, domain:infra, priority:medium, milestone:v1]

#### Description

Add multi-stage `Dockerfile`s for `backend` and `frontend` with a `production` target
(build stage + slim runtime, no dev dependencies, no bind mounts). Add
`docker-compose.prod.yml` at the repository root, structurally parallel to
`docker-compose.yml` but pulling pre-built images (`ghcr.io/...:${IMAGE_TAG:-latest}`)
instead of building locally, and routed through Traefik's `websecure` entrypoint with
`tls.certresolver=letsencrypt` on `${DOMAIN}`, matching the pattern already in
production use on HiveMind.

This item prepares the deployment artefacts only. It does not touch the production
server and does not run any deployment.

#### Acceptance criteria

- `backend/Dockerfile` and `frontend/Dockerfile` each expose a `production` target
  producing a minimal runtime image (no source bind mounts, no dev dependencies)
- `docker-compose.prod.yml` references images by tag, not a local build context
- Traefik labels use `websecure` entrypoint, TLS enabled, `certresolver=letsencrypt`,
  `Host(\`${DOMAIN}\`)` routing, backend under `/api` with prefix stripped
- No credentials hardcoded; all secrets come from environment variables / env file
- `docker-compose.prod.yml` builds and starts locally against the production images
  when manually tested with a locally-built image tag

#### Resolution (2026-09-08)

Implemented `backend/Dockerfile` and `frontend/Dockerfile` with `base` → `dev`/`build` →
`production` multi-stage targets, replacing the standalone `Dockerfile.dev` files.
`docker-compose.prod.yml` added at repo root, pulling `ghcr.io/.../backend:${IMAGE_TAG:-latest}`
and `:frontend`, routed through Traefik's `websecure` entrypoint with
`tls.certresolver=letsencrypt` on `Host(\`${DOMAIN}\`)`, backend under `/api` with the
prefix stripped — mirroring the pattern already in production use on HiveMind. Secrets
come from an external env file (`../shared/env/app.env`, injected via both `env_file:`
on the backend service and `--env-file` at `docker compose` invocation time), no
hardcoded credentials.

Full stack smoke-tested locally end to end (locally-built `:test` images, dummy
credentials, throwaway Postgres volume): `docker compose -f docker-compose.prod.yml
--env-file ... up -d` starts postgres (healthy), backend, and frontend; `GET /api`
returns 200 and the frontend serves the SPA correctly.

Two latent bugs surfaced and fixed along the way, both pre-existing and independent of
Docker itself:
- `backend/package.json`'s `start:prod` (`node dist/main`) never matched the actual
  `nest build` output. `tsconfig.build.json` has no `rootDir`, and `prisma.config.ts`
  plus the `generated/prisma` client both live outside `src/`, so TypeScript infers the
  build's common root as the whole `backend/` directory — output lands at
  `dist/src/main.js`, not `dist/main.js`. Narrowing `rootDir` to `./src` was tried and
  rejected: it breaks compilation of files importing `generated/prisma/client`, which
  is intentionally outside `src/` (see `CLAUDE.md`). Fixed `start:prod` and the
  Dockerfile `CMD` to point at the real path (`dist/src/main`) instead.
- Prisma 7's CLI requires `prisma.config.ts` at the project root for `migrate deploy`
  to know the datasource URL. The production image didn't have it. Copying the
  compiled `dist/prisma.config.js` failed ("Failed to parse syntax") — Prisma's config
  loader expects to load the TS source directly. Fixed by copying the raw
  `prisma.config.ts` into the production image instead of a compiled artifact.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CI-004] Build and deploy pipeline — GHCR images and VPS deployment

- **type:** ci
- **id:** CI-004
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** infra
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-007
- **learning:** [GitHub Actions workflow_run triggers, GHCR authentication and image push, SSH deployment via GitHub Actions, remote docker compose orchestration]
- **labels:** [ci, domain:infra, priority:medium, milestone:v1]

#### Description

Add a `build-deploy.yml` workflow that builds and pushes the backend and frontend
`production` images to GHCR after CI passes on `main` (or via manual
`workflow_dispatch`), then deploys by SSHing into the VPS, pulling the new images,
running pending Prisma migrations, and restarting the stack via
`docker-compose.prod.yml` — mirroring the workflow already in production use on
HiveMind.

This workflow is authored and committed as part of this item, but is never executed by
the implementation thread: it only runs once merged to `main` via GitHub Actions, using
repository secrets (`DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_PRIVATE_KEY`,
`DOMAIN`, `VITE_API_BASE_URL`) that must be configured by the repository owner. No
direct SSH access to the production server is performed outside of this pipeline.

#### Acceptance criteria

- Workflow builds and pushes tagged + `latest` images for backend and frontend to GHCR
- Workflow triggers after a successful CI run on `main`, and supports manual dispatch
- Deployment step fetches `docker-compose.prod.yml` at the deployed commit SHA, pulls
  images, runs `prisma migrate deploy`, then restarts the stack
- Required secrets are documented in `CONTRIBUTING.md` (names only, no values)
- Workflow fails loudly (non-zero exit) if any step fails, with no partial silent state

#### Resolution (2026-09-10)

`build-deploy.yml` merged via PR #185 (2026-09-09), covering the build, push, and
migration-deploy steps against all five acceptance criteria above.

The first real deploy surfaced a gap not covered by those criteria: the admin account
was never created in production, because the pipeline never ran `prisma db seed`, and
`tsx` (which executes `backend/prisma/seed.ts` per `prisma.config.ts`) was a
`devDependency`, unavailable in the `--omit=dev` production image. Fixed by moving
`tsx` to `dependencies` and adding a seed step to the deploy workflow, right after
`prisma migrate deploy`, using the same `run --rm --no-deps backend` pattern. The seed
is idempotent by design (`upsert` with `update: {}` on conflict in `seedAdminUser()`),
so running it on every deploy never overwrites an existing account. The two VPS-side
variables it needs (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) are documented in
`CONTRIBUTING.md` alongside the existing repository-secrets table.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-001] UI/UX design pass — encode, decode and key views

- **type:** refactor
- **id:** REFACTOR-001
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-014, FEAT-015, FEAT-016
- **learning:** [visual hierarchy, accessibility (WCAG contrast/focus states), responsive layout patterns, design token systems, Vue.js component polish without behavioural regressions]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v1]

#### Description

Audit and polish the encode, decode, and key views once they are functionally complete.
No new features and no behavioural changes — this item covers visual hierarchy,
spacing/typography consistency, accessibility (contrast, focus states, keyboard
navigation), responsive behaviour, empty/error/loading states, and light/dark theming if
applicable. Existing i18n keys and API contracts are unaffected.

#### Acceptance criteria

- All three views reviewed for visual hierarchy, spacing, and typography consistency
- Accessibility check: sufficient contrast, visible focus states, keyboard-navigable forms
- Responsive behaviour verified at common breakpoints (mobile, tablet, desktop)
- Loading, error, and empty states have clear, consistent visual treatment
- No functional regression: all existing frontend tests (TEST-003) still pass
- No new i18n keys required unless a genuinely new UI string is introduced
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-008] Security hardening audit — OWASP Top 10 review

- **type:** chore
- **id:** CHORE-008
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** security
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-011, FEAT-012, FEAT-013, FEAT-021, REFACTOR-001
- **learning:** [OWASP Top 10:2025, input validation boundaries, rate limiting, secure header configuration, dependency vulnerability scanning, fail-closed startup validation]
- **labels:** [chore, domain:security, priority:high, milestone:v2]

#### Description

Full security review of the API surface and authentication flow once all v1 endpoints
and the FEAT-021 auth/registration flow exist, run before any real (non-`.local`)
exposure of the deployed stack. Covers injection risks, broken access control, auth/session
handling (JWT + verification tokens), rate limiting on public endpoints (registration,
login, resend-verification), sensitive data exposure, security headers, and dependency
vulnerabilities. Findings are triaged and fixed inline; anything deferred is logged as a
new backlog item rather than silently dropped.

#### Acceptance criteria

- Every finding is classified by severity and either fixed or turned into a tracked
  backlog item with a rationale for deferring it
- Rate limiting is verified in place for registration, login, and resend-verification
- JWT and verification-token handling reviewed against OWASP session management guidance
- No secrets or sensitive data found logged, exposed in error responses, or committed
- Dependency audit (`npm audit` or equivalent) run on both backend and frontend, with
  high/critical findings addressed or explicitly deferred with rationale

#### Resolution (2026-09-08)

Findings, all fixed inline unless noted:

- Missing HTTP security headers: fixed by adding Helmet (`app.use(helmet())` in
  `backend/src/main.ts`).
- `JWT_SECRET` silently accepted missing/placeholder/short values: fixed with a
  fail-fast `resolveJwtSecret()` startup guard in `backend/src/auth/auth.module.ts`
  (rejects unset, the documented `change_me` placeholder, and anything under 32 chars).
- Seed admin account silently fell back to a documented placeholder email/password:
  fixed by requiring `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` explicitly and rejecting
  the placeholder password in `backend/prisma/seed.ts` (CI env updated to match).
- Reachable production `qs`/body-parser dependency vulnerabilities (backend) and
  dev-tooling vulnerabilities (frontend): fixed via non-breaking `npm audit fix` on
  both sides; frontend now at 0 vulnerabilities.
- `EncodeRequestDto.message` had no upper bound, so hitting the cipher layer's
  existing `MAX_MESSAGE_LENGTH` (0xffff) internal cap surfaced as a raw 500 instead
  of a clean validation error: fixed by adding `@MaxLength(MAX_MESSAGE_LENGTH)` to
  the DTO.
- Rate limiting confirmed in place: `register`, `login`, `resend-verification` all
  carry `@Throttle({ limit: 5, ttl: 60000 })`; `verify-email` relies on the global
  default (20/60s), which is safe since its token is a 256-bit random value
  (`randomBytes(32)`), making brute force infeasible regardless of rate limit.
- JWT and verification-token handling reviewed against OWASP session management
  guidance: bcrypt (12 rounds) password hashing, sha256-hashed verification tokens,
  timing-safe login via a precomputed dummy hash, per-request `active` re-check in
  `JwtAuthGuard` - no changes needed.
- No secrets or sensitive data found logged, exposed in error responses, or
  committed (grepped for `err.message`/`error.message`/`e.message` and
  `passwordHash` usage across `src/`).
- Remaining backend `npm audit` findings (`lodash`, `mysql2`, `deepmerge-ts`,
  `@prisma/config`) are nested exclusively under the `prisma` CLI's own dependency
  tree, unreachable from any runtime code path; deferred with rationale as
  **CHORE-010** rather than forcing an unjustified breaking `prisma` downgrade.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CI-005] Codecov integration — coverage reporting and PR diff comments

- **type:** ci
- **id:** CI-005
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** TEST-001, TEST-002, TEST-003
- **learning:** [Codecov GitHub Action, OIDC-based auth (tokenless), lcov coverage report formats, coverage flags, coverage badges, PR coverage diff comments]
- **labels:** [ci, domain:infra, priority:medium, milestone:v1]

#### Description

Upload the backend (Jest, unit + e2e combined under one `backend` flag) and frontend
(Vitest) coverage reports to Codecov via the official `codecov/codecov-action`, using
OIDC (`use_oidc: true`) rather than a stored `CODECOV_TOKEN` secret - the same
tokenless auth pattern already used across this developer's other tracked projects
(HiveMind, GeoChallenge-Tracker, Triton, CC-Beacon). A `codecov.yml` at the repo root
configures the `backend`/`frontend` flags, per-flag ignore paths (entry points, DI
wiring, generated code), and the project-wide coverage target. A coverage badge is
added to `README.md`/`README.fr.md`.

#### Acceptance criteria

- Backend CI job uploads both its unit (`backend/coverage/lcov.info`) and e2e
  (`backend/coverage-e2e/lcov.info`) reports under a single `backend` flag; frontend CI
  job uploads its report under a `frontend` flag
- Both jobs authenticate via OIDC (`use_oidc: true`, `permissions: id-token: write`) -
  no `CODECOV_TOKEN` secret is created or referenced
- `codecov.yml` defines the `backend`/`frontend` flags with their paths and ignore
  lists, and a project coverage target consistent with `docs/tests/index.md`'s
  documented ≥85% global bar
- README (both languages) displays a Codecov coverage badge
- Codecov posts a coverage diff comment on pull requests
- No hardcoded credentials in the workflow file
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [TEST-005] Coverage reconciliation — real backend peripheral + global combined numbers

- **type:** test
- **id:** TEST-005
- **milestone:** v1
- **status:** done
- **priority:** medium
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** TEST-001, TEST-002, TEST-003
- **learning:** [Jest multi-config coverage collection, rootDir resolution for collectCoverageFrom, combining unit and integration coverage under one Codecov flag]
- **labels:** [test, domain:infra, priority:medium, milestone:v1]

#### Description

TEST-001/002/003 each closed their own layer's coverage gap, but left one real question
open: is the ≥85% "Global (backend + frontend combined)" bar from `docs/tests/index.md`
actually true, or just true for each layer measured in isolation? The backend's
peripheral layer (API controllers, renderer, validation) is exercised by the e2e suite
(TEST-002), not by unit tests, and the e2e Jest config (`jest-e2e.json`) had no coverage
collection configured at all - so that layer's real number was never measured. This item
adds e2e coverage collection and verifies the real combined number, using Codecov (see
CI-005) as the cross-report merging mechanism rather than hand-rolling local coverage
merging.

#### Acceptance criteria

- `backend/test/jest-e2e.json` collects coverage from `src/**` (excluding `*.module.ts`,
  matching TEST-001's exclusion), output to a separate `coverage-e2e` directory so it
  doesn't clobber the unit run's `coverage` directory
- A `test:e2e:cov` script runs the e2e suite with coverage collection
- CI's backend job runs `test:e2e:cov` (not the plain `test:e2e`) and uploads both the
  unit and e2e reports to Codecov
- Real measured numbers for the backend's peripheral layer (controllers, renderer,
  validation) are visible in Codecov, not just assumed - confirmed locally: 90.85%
  stmts / 72.9% branch / 95.29% funcs / 91.2% lines for the e2e-only report
- The `project` coverage status in `codecov.yml` starts `informational: true` (the true
  merged number has never actually been observed before this branch); flip to `false`
  once the first real PR shows it clearing the ≥85% target - tracked as a quick
  follow-up, not a separate backlog item
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-002] Two-column result layout — encode and decode views

- **type:** refactor
- **id:** REFACTOR-002
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** REFACTOR-001
- **learning:** [CSS grid two-column responsive layout, viewport-height-aware scroll-into-view]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v2]

#### Description

A post-REFACTOR-001 re-critique (`.impeccable/critique/2026-08-20T09-40-23Z__hexarot-frontend-encode-decode-key-views.md`,
score 18/40) found that single-column stacking defeats the app's own submit-feedback
fix: on common desktop viewport heights, the page runs out of scrollable height before
the result panel reaches the top of the viewport, so `revealResult`'s scroll-into-view
can never actually bring the result fully into view - verified live (scrollY maxes out
with the result still ~370px down). A `grid-template-columns: minmax(360px, 480px) 1fr`
layout (form left, result right, collapsing to one column under ~900px) fixes this
structurally, lets the cryptogram render larger than the current 280px, and uses the
~60% of the desktop canvas that currently sits empty next to the centred column.

This item is pure layout/visual-design work — no state, validation, or crypto-domain
logic changes. See REFACTOR-003 (stale-result invalidation) and CHORE-009 (key/size
binding investigation) for the other findings from the same re-critique, kept separate
since they are a different kind of work.

#### Acceptance criteria

- Encode and Decode use a two-column layout (form + result/preview) at desktop widths,
  single-column below ~900px
- The result never requires scrolling past the fold to be visible on a standard
  1280x800 viewport
- No functional regression: all existing frontend tests (TEST-003) still pass
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-003] Invalidate a stale encode result on parameter change

- **type:** refactor
- **id:** REFACTOR-003
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** REFACTOR-001
- **learning:** [Pinia $subscribe vs component-level watchers for cross-field invalidation]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v2]

#### Description

Found by the same post-REFACTOR-001 re-critique as REFACTOR-002
(`.impeccable/critique/2026-08-20T09-40-23Z__hexarot-frontend-encode-decode-key-views.md`).
Editing the message or any transform parameter after a successful encode currently
leaves the old cryptogram and key on screen, still fully downloadable and copyable,
with no indication they no longer match the current form state - a user can produce a
key/image pair that will never decode together. This is a state-correctness bug, not a
visual one: kept separate from REFACTOR-002's pure layout work and from CHORE-009's
crypto-domain investigation.

Needs a UX decision before implementation: clear the result outright vs. dim it and
disable its actions vs. auto-resubmit. Bring the options back for a quick confirmation
before writing the fix.

#### Acceptance criteria

- Editing a parameter that affects the encode output while a previous result is
  displayed visibly invalidates that result before the user can download or copy a
  mismatched key/cryptogram pair
- The chosen approach (clear / dim+disable / auto-resubmit) is confirmed before
  implementation, not defaulted silently
- No functional regression: all existing frontend tests (TEST-003) still pass
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-009] Investigate binding the cryptogram size to the key

- **type:** chore
- **id:** CHORE-009
- **milestone:** v2
- **status:** done
- **priority:** low
- **domain:** backend
- **complexity:** M
- **parent:** ~
- **depends-on:** REFACTOR-001
- **learning:** [KeyCodec bit-packing layout, key-format versioning strategy, image-dimension-based size inference]
- **labels:** [chore, domain:backend, priority:low, milestone:v2]

#### Description

Found by the same post-REFACTOR-001 re-critique as REFACTOR-002 and REFACTOR-003
(`.impeccable/critique/2026-08-20T09-40-23Z__hexarot-frontend-encode-decode-key-views.md`).
Decode requires the user to recall the cryptogram size (small/medium/large) used at
encode time - the key does not carry it and the app never displays or stores it
anywhere after the fact, so a mismatch is a common, hard-to-diagnose decode failure.

This is a crypto/key-format question, not a UI one - kept separate from REFACTOR-002
and REFACTOR-003's frontend-only work. Two candidate directions, to be evaluated as a
spike before committing to either:

1. Pack the size into the key payload - a `KeyCodec` version bump (the current V1 bit
   layout is fully used: pivotBlockSize 0-7, readingOrderIndex 8-10, rotationDirection
   11, rotationSequenceIndex 12-16; adding size needs either spare bits or a new byte),
   which is a breaking format change requiring its own versioning story.
2. Infer the size from the uploaded image's pixel dimensions on the Decode side -
   frontend/backend-boundary-only, no key-format change, but only works for PNG (SVG
   viewBox dimensions may not map 1:1 to the size enum depending on how the renderer
   scales).

#### Acceptance criteria

- A short written recommendation (in this item or a linked note) choosing one
  direction, with the reasoning and what it would require to implement
- If direction 1 is chosen: a follow-up FEAT/REFACTOR item is opened for the actual
  `KeyCodec` version bump, scoped separately since it touches the backend cipher
  domain and needs its own test plan
- If direction 2 is chosen: confirms whether it works for both PNG and SVG uploads,
  or documents why it's PNG-only

#### Recommendation (resolved 2026-08-22)

**Direction 1 - pack the size into the key.** This item's original framing turned out
to overstate the cost: it does **not** require a breaking version bump.

`KeyCodec`'s V1 payload is 4 base36 characters (`backend/src/key/key-codec.ts:31-102`),
representing up to `36^4 - 1 = 1,679,615` (21 bits' worth of range). The currently
assigned fields only use bits 0-16 (17 bits): `pivotBlockSize` (0-7), `readingOrderIndex`
(8-10), `rotationDirection` (bit 11), `rotationSequenceIndex` (12-16). Bits 17-20 (4 bits)
are unused. `size` is the same 3-value enum (`small`/`medium`/`large`) used everywhere
else in the app - not a numeric magnitude - so it needs an *index* into 3 values, which
fits in 2 bits (0-3, one value spare) at bits 17-18. The resulting max payload value is
`2^19 - 1 = 524,287`, comfortably under the 4-character format's `1,679,615` ceiling.
**No payload-length change, no version bump, no new versioning story required** - this
is a backward-compatible additive extension of the existing V1 format, the same way
`rotationDirection` fits in 1 bit for 2 values and `readingOrderIndex` fits in 3 bits
for 8 values.

Direction 2 (infer size from image pixel dimensions) was ruled out. Both renderers
compute `dimensions_px = gridCells(messageLength, pivotBlockSize, symbolWidth/Height) *
casePixels(size)` (`backend/src/renderer/palette.ts:21-26`, `build-grid.ts:28-88`,
`png-renderer.ts:32-34`, `svg-renderer.ts:28-30,44`). Grid cell counts vary with message
length and `pivotBlockSize`, so the same `size` yields different pixel dimensions across
messages, and different `size` values can coincidentally produce identical pixel
dimensions (the 8:16:32 px/cell ratios are 1:2:4, so e.g. `large` on a small grid equals
`small` on a 4x-larger grid). This ambiguity is already acknowledged in the codebase:
`DecodeRequestDto.size` is a required field (unlike Encode's optional one), and
`png-parser.ts`'s own doc comment notes the parser cannot structurally distinguish
some `casePixels` values from image content alone. SVG's `viewBox` uses the same
scaled-pixel space as PNG, not an independent abstract unit, so it doesn't help either.

**Follow-up item opened: FEAT-022** (KeyCodec size field), scoped separately per this
item's acceptance criteria.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-004] Stop sending the decryption key in a URL query string

- **type:** refactor
- **id:** REFACTOR-004
- **milestone:** v2
- **status:** done
- **priority:** critical
- **domain:** security
- **complexity:** M
- **parent:** ~
- **depends-on:** ~
- **learning:** [GET-with-secrets-in-query-string anti-pattern, request-body-vs-query-param API design, key-format client-side parsing]
- **labels:** [refactor, domain:security, priority:critical, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`,
score 14/40). `frontend/src/stores/key.ts`'s `parse()` action calls
`getJson('/key/parse', { key: ... })`, which `frontend/src/api/client.ts` turns into
`GET /api/key/parse?key=HR1%C2%B7a1b2` - the decryption key ends up in the URL. A GET
query string is written by default into server access logs, any reverse-proxy logs
(this project routes through Traefik locally - see CHORE-006), and the browser's own
history/cache. This is the same failure class the previous fix batch closed for
downloaded filenames (critique #6, "a cipher's key must travel on a separate channel
from the cryptogram it decrypts") - that principle wasn't carried to this second,
more durable and more shared leak channel.

Two candidate directions:

1. Change `POST /api/key/parse` to accept the key in a JSON body instead of a query
   parameter - a backend route + frontend caller change, no crypto-format change.
2. Parse the key entirely client-side and drop the server round trip - only viable if
   `KeyCodec`'s decode algorithm (currently backend-only) is ported or shared with the
   frontend, which is a larger undertaking than it first appears.

Direction 1 is the recommended default: smaller, contained, no duplication of
crypto-domain logic across the frontend/backend boundary.

#### Acceptance criteria

- The key is no longer present in any URL sent by the frontend (encode's key-mode
  submit already uses POST body - only `/key/parse` is affected)
- `GET /api/key/parse` either stops being served or the frontend no longer calls it
- Manually confirmed: no key material appears in the Network tab's request URL for
  the key-parser flow
- Existing key-parser tests (frontend and backend) updated for the new request shape
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-005] Keep Copy and Download enabled while a result is stale

- **type:** refactor
- **id:** REFACTOR-005
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** REFACTOR-007
- **learning:** [disabled-state UX for "may be outdated" vs "is invalid" data]
- **labels:** [refactor, domain:frontend, priority:high, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`).
All four stale result surfaces (Encode, Decode, Key generator, Key parser) disable
their Copy and Download actions the moment any form field changes, on top of a result
whose key hint explicitly says "Neither is stored anywhere - copy or download them
now." A user who edits a typo after encoding loses the only way to save the artifact
still on screen. Staleness means "this may not reflect your current form state," not
"this is invalid" - the underlying result blob is still perfectly good.

**Depends on REFACTOR-007**: today, disabling downloads while stale is the only thing
preventing the live-bound `store.size` bug (see REFACTOR-007) from shipping a
mismatched size into a downloaded filename. Re-enabling downloads before REFACTOR-007
snapshots the size would turn a latent bug into an active one - do REFACTOR-007 first.

#### Acceptance criteria

- Copy and Download remain enabled (not `:disabled`) while a result is stale, on all
  four surfaces
- The stale notice still appears and still offers the re-submit action
- Existing stale-state tests updated to assert the buttons stay enabled instead of
  disabled
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-006] Stop destroying the previous result on a failed submit

- **type:** refactor
- **id:** REFACTOR-006
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** ~
- **learning:** [optimistic-clear vs preserve-until-success state transitions in Pinia]
- **labels:** [refactor, domain:frontend, priority:high, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`),
confirmed with DOM sampling at 40ms into a failing request. `stores/encode.ts`,
`stores/decode.ts`, and `stores/key.ts` (both `generate()` and `parse()`) all null
their result field the instant `status` flips to `loading`, before the request is
even sent. A transient failure on a re-submit (typo, flaky network) destroys the
previous successful, unrecoverable result - worst on the key generator, whose own
hint says "This key is not stored anywhere. Copy it now."

#### Acceptance criteria

- On all four submit paths (encode, decode, key generate, key parse), the previous
  result stays visible and intact while a new request is in flight and after a
  failed request - only a *successful* response replaces it
- The error message still displays (alongside or instead of the stale result, per
  whatever layout REFACTOR-005's surrounding work settles on)
- Existing "shows a loading indicator" / "sets status to error" tests updated to also
  assert the previous result is still present
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-007] Snapshot the cryptogram size into the encode result

- **type:** refactor
- **id:** REFACTOR-007
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [snapshotting request params into a result object vs reading live form state]
- **labels:** [refactor, domain:frontend, priority:high, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`).
`EncodeResultPanel.vue` renders `t(\`encode.form.size.\${store.size}\`)` and builds the
download filename from `store.size` - both read the *live* form field, not a snapshot
of the size that actually produced the displayed result. Verified live: encode at
Small, change the size dropdown to Large without re-encoding, and the panel shows
"Cryptogram size: Large" beside the Small key and cryptogram. The panel's own hint
says the user needs both the key and the size to decode - displaying the wrong one
next to a real key is the single highest-consequence bug found across all seven
critique rounds.

#### Acceptance criteria

- `EncodeResult` (or the store's success state) carries the `size` that was actually
  submitted with the request, separate from the live `store.size` form field
- `EncodeResultPanel.vue`'s size label and `downloadFilename()` both read the
  snapshotted value, never `store.size`
- Regression test: encode at one size, change the size field without re-encoding,
  assert the displayed size and any download filename still reflect the original size
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-008] Copy button includes the cryptogram size alongside the key

- **type:** refactor
- **id:** REFACTOR-008
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** REFACTOR-007
- **learning:** [clipboard payload design when a hint promises more than one value]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`).
`EncodeResultPanel.vue`'s Copy button calls
`navigator.clipboard.writeText(props.result.key)` - key only. The adjacent hint text
says "You'll need both this key and the cryptogram size... copy or download them
now." Clipboard is the dominant path for sharing a key; the button currently delivers
only half of what its own copy promises. Depends on REFACTOR-007 so there is a
snapshotted, trustworthy size value to copy.

#### Acceptance criteria

- Copy writes both the key and the size to the clipboard in one readable string
  (e.g. `HR1·a3f9 · Large`)
- The button label or the copied format makes clear both values are included
- Existing copy tests updated to assert the size is present in the clipboard payload
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-009] Fix Encode form horizontal overflow on mobile

- **type:** refactor
- **id:** REFACTOR-009
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [fieldset min-inline-size default, box-sizing content-box vs border-box in a flex form]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`),
root-caused and fix verified live. At a real 360px viewport, Encode overflows the
page horizontally by 112px; Key and Decode do not. Cause: `.encode-params-form__group`
is a `<fieldset>` with computed `min-inline-size: min-content` (the UA default, which
ordinary width rules can't override) and `box-sizing: content-box`, so it refuses to
shrink below its widest child - the reading-order `<select>`, 407px wide. Key has no
fieldset wrapper and already uses `border-box`, which is exactly why it's already
clean. Injecting `min-inline-size: 0; box-sizing: border-box` on the fieldset dropped
the overflow from 112px to 0px in live testing.

#### Acceptance criteria

- `frontend/src/components/EncodeParamsForm.vue`'s fieldset(s) get
  `min-inline-size: 0` and `box-sizing: border-box`
- At a 360px viewport, `#app.scrollWidth === #app.clientWidth` (no horizontal
  overflow) on `/encode`
- No visual regression on desktop widths (≥900px) where the two-column layout applies
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-010] Stop the "Out of date" badge from overlapping cryptogram cells

- **type:** refactor
- **id:** REFACTOR-010
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [positioning a status badge relative to a fluid-width image without occluding its content]
- **labels:** [refactor, domain:frontend, priority:medium, milestone:v2]

#### Description

Found by critique #6 and re-measured by critique #7
(`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`).
`.encode-result-panel__stale-badge` is `position: absolute; top: 8px; right: 8px`
inside a preview box whose padding shrinks below the SVG's own footprint at narrow
widths. Measured at 360px: 2 of 36 cryptogram cells overlapped (24-38% of their
area), and the badge's translucent background measurably tints the colors underneath
(8-10 point RGB shift). This directly contradicts the component's own design
rationale (`EncodeResultPanel.vue`'s comment on why the preview isn't dimmed when
stale) - the cryptogram's cell colors are the message, and the badge is currently
allowed to sit on top of them.

#### Acceptance criteria

- The stale badge never visually overlaps the rendered cryptogram cells, at any
  preview width down to the smallest supported viewport
- Verified at both a wide (≥900px) and narrow (~360px) viewport
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-011] Make the decoded-message scroll container keyboard-reachable

- **type:** refactor
- **id:** REFACTOR-011
- **milestone:** v2
- **status:** done
- **priority:** low
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [WCAG 2.1.1 keyboard-operability for a scrollable overflow region]
- **labels:** [refactor, domain:frontend, priority:low, milestone:v2]

#### Description

Found by critique #7 (`.impeccable/critique/2026-08-21T15-56-57Z__hexarot-frontend-encode-decode-key-views.md`) -
a regression introduced by critique #6's decode-readability fix. `.decode-view__result`
has `overflow-y: auto` (needed for long messages) but no `tabindex`, `role`, or
`aria-label`, so it's not part of the keyboard tab order. Verified live: with a
7200-character decoded message, a keyboard-only user can reach the first ~260px
(scrollHeight 3836 vs clientHeight 260) and no more - roughly 7% of the content.

#### Acceptance criteria

- `.decode-view__result` (or its scrollable wrapper) is keyboard-focusable
  (`tabindex="0"`) and scrollable via arrow keys once focused
- Has an `aria-label` identifying it as the decoded message
- Manually verified with keyboard-only navigation that the full message is reachable
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-022] Pack the cryptogram size into the key (KeyCodec)

- **type:** feat
- **id:** FEAT-022
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** backend
- **complexity:** M
- **parent:** ~
- **depends-on:** CHORE-009
- **learning:** [KeyCodec bit-packing, backward-compatible payload extension, key/size round-trip]
- **labels:** [feat, domain:backend, priority:medium, milestone:v2]

#### Description

Implements the direction chosen by CHORE-009's investigation: bind the cryptogram
size to the key itself, closing the original UX gap where decode requires the user
to independently recall which size was used at encode time.

`KeyCodec`'s V1 payload (`backend/src/key/key-codec.ts`) currently packs
`pivotBlockSize` (bits 0-7), `readingOrderIndex` (8-10), `rotationDirection` (bit 11),
and `rotationSequenceIndex` (12-16) into a 4-character base36 string. Add a 2-bit
`sizeIndex` field at bits 17-18 (`small=0`, `medium=1`, `large=2`; value `3` reserved -
`decode()` should reject it the same way an out-of-range rotation sequence index is
rejected today). This stays within the format's existing 4-character budget - no
version bump, no length change (see CHORE-009's recommendation for the bit-budget
math).

**Touchpoints to update:**
- `KeyParams` interface gains a required `size: CaseSize` field; `pack()`/`unpack()`
  extended accordingly.
- `KeyService.generate()` and the `KeyGenerateRequestDto` need a `size` input (default
  `'medium'`, matching Encode's own default).
- `KeyService.parse()`'s `KeyParseResult` gains `size` in its response.
- `EncodeService.encode()`: when generating a new key (params mode), the key must now
  embed the *actual* `size` used for that encode request, not a default.

**Open design question for the implementer to resolve** (not decided by this item):
when Encode's "existing key" mode is used, the request also carries its own separate
`size` field - should the key's embedded size take precedence, must the two match
(validation error on mismatch), or does the explicit request field simply override
what's in the key? Pick one and document the reasoning; there's no clearly-correct
default here without seeing how the frontend wants to present it.

Frontend UX changes (e.g. auto-filling Decode's size field once a key is parsed) are
explicitly **out of scope** for this item - keep this backend/key-format change
separate from any frontend work, per the project's established preference for not
mixing domains in one item. Open a separate frontend follow-up once this lands, if
that UX improvement is still wanted.

#### Acceptance criteria

- `KeyCodec.encode()`/`decode()` round-trip `size` losslessly alongside the existing
  four fields, verified for all three size values
- Existing key strings generated before this change still decode without throwing
  (backward compatible - bits 17-18 read as `0`/`small` for old keys, which is an
  acceptable, non-breaking default since no prior key ever encoded real size
  information)
- `decode()` rejects a key whose `sizeIndex` unpacks to the reserved value `3`
- `POST /key/generate` and `POST /key/parse` both round-trip `size` through their
  request/response shapes
- `POST /encode` embeds the actual requested `size` into any key it generates
- Unit tests for the bit-packing (mirroring the existing `rotationSequenceIndex`/
  `readingOrderIndex` test coverage) plus e2e coverage for the two updated endpoints

#### Resolution (2026-08-22)

Open design question resolved: **the key is authoritative**. When `POST /encode`
is called in "existing key" mode, the key's own embedded `size` is always used for
rendering, and a differing `dto.size` in the same request body is silently ignored -
consistent with how `pivotBlockSize`/`rotationSequence`/`rotationDirection`/
`readingOrder` already behave in that mode. This keeps a key fully self-sufficient:
it never describes a cryptogram rendered at a different size than what it says.
The cost is that Encode's frontend size selector becomes silently ineffective in
key-mode until a frontend follow-up surfaces this (not part of this item's scope).

Implemented in `backend/src/key/key-codec.ts` (`sizeIndex` at bits 17-18, no
version bump needed), `backend/src/api/key.service.ts`,
`backend/src/api/dto/key-generate-request.dto.ts`, and
`backend/src/api/encode.service.ts`. `DecodeService`/`DecodeRequestDto` needed no
changes (out of scope, doesn't construct `KeyParams` literals).
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-023] Frontend authentication + admin UI + backend password complexity

- **type:** feat
- **id:** FEAT-023
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** XL
- **parent:** ~
- **depends-on:** FEAT-021
- **learning:** [Vue Router navigation guards, Pinia store composition around a shared token module, avoiding circular imports between an API client and a store, live password-strength feedback, confirm-before-destructive-action UI pattern]
- **labels:** [feat, domain:frontend, priority:medium, milestone:v2]
FEAT-021 gated every API route except the four auth endpoints and `GET /` behind a
valid JWT, but the frontend had zero auth integration: no login/register views, no
token attachment, no route guarding. This item closes that gap: a full
register/verify-email/login/resend-verification flow, route guards on
`encode`/`decode`/`key` matching the backend's deny-by-default posture, and a basic
admin UI (list/deactivate/reactivate/delete) for the account-moderation endpoints
FEAT-021 shipped but no frontend ever consumed. Also adds backend-enforced password
complexity (lowercase, uppercase, digit, special character) on top of the existing
12-72 character length bounds, since it only matters once a register UI exists to
exercise it.
- User can register with email + password; sees a "check your email" panel, no
  auto-login
- `RegisterDto.password` rejects passwords missing a lowercase letter, uppercase
  letter, digit, or special character with a 400 response
- User can follow the verification link and see a success or error state; an
  expired/invalid token surfaces a resend-verification form inline
- User can log in; a distinguishable message is shown for invalid credentials,
  unverified email, and a disabled account (no account enumeration)
- Visiting `/encode`, `/decode`, `/key`, or `/admin/users` without a valid session
  redirects to `/login?redirect=<path>`; a successful login returns the user to
  that path
- The access token is attached to every API request; a `401` on an authenticated
  request clears the session and redirects to `/login`
- Admin-only `/admin/users` lists users and lets an admin toggle active/inactive
  or delete an account (with a confirmation dialog before delete); self-action
  errors from the backend are surfaced as returned
- The "Admin" nav link is visible only to a logged-in admin
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-010] Revisit deferred prisma-CLI npm audit findings

- **type:** chore
- **id:** CHORE-010
- **milestone:** v2
- **status:** done
- **priority:** low
- **domain:** backend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [npm audit transitive-dependency reachability]
- **labels:** [chore, domain:backend, priority:low]

#### Description

Deferred finding from CHORE-008's security hardening audit. `npm audit` on
`backend/` reports vulnerabilities in packages (`lodash`, `mysql2`,
`deepmerge-ts`, `@prisma/config`) that are nested exclusively under the
`prisma` CLI's own dependency tree, not under the runtime
`@prisma/client`/`@prisma/adapter-pg` packages the app actually imports.
These are dev-time-only, unreachable from any deployed code path (no
production Dockerfile currently runs the `prisma` CLI at runtime; migrations
are applied via `prisma migrate deploy` in CI/dev only). `npm audit fix --force`
would downgrade `prisma` to a version incompatible with the project's
Prisma 7 usage, which is not justified for an unreachable finding.

Revisit when either: Prisma publishes a patched release that resolves these
transitively without a breaking downgrade, or a production Dockerfile is
introduced that invokes the `prisma` CLI at runtime (changing the
reachability analysis).

#### Acceptance criteria

- `npm audit` on `backend/` run again; findings re-triaged against current
  reachability
- If still unreachable and unpatched, re-defer with an updated rationale and
  date
- If reachable or patched, fix and close

#### Resolution (2026-09-08)

`npm audit` re-run on `backend/`: same 4 high severity findings as CHORE-008
(`deepmerge-ts`, `mysql2`, nested under `@prisma/config` under `prisma@7.10.0`).
`npm audit fix --force` still proposes downgrading `prisma` to `6.19.3`,
incompatible with the project's `@prisma/client@7.10.0` usage — still not
justified for these findings.

`@prisma/client` only lists `prisma` as a peer dependency (`*`), never
`require()`s it; the production runtime path (`node dist/src/main`) never
touches the CLI's code.

One nuance versus the original deferral rationale: CHORE-007 (production
Dockerfiles) shipped since this item was created. `prisma` is a
`dependencies` entry, not `devDependencies`, so `npm ci --omit=dev` in
`backend/Dockerfile`'s production stage does install it, and
`prisma.config.ts` is copied into that image specifically so `prisma
migrate deploy` can be run against it as a one-off deployment step. So the
CLI is present and usable in the production image now — but the container's
own `CMD` (`node dist/src/main`) still never invokes it automatically at
startup, so the "unreachable from any deployed/running code path" analysis
still holds. Re-defer criterion updated accordingly: revisit again if a
deploy process is introduced that runs `prisma migrate deploy` as part of
the running production container itself (rather than as a separate one-off
invocation against the image), or when Prisma publishes a non-breaking fix.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FIX-001] Seed accepts the documented admin password placeholder

- **type:** fix
- **id:** FIX-001
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** backend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [config placeholder guards drift from documentation]
- **labels:** [fix, domain:backend, priority:high]

#### Description

`backend/prisma/seed.ts` (`seedAdminUser`) refuses to seed the admin account
when `SEED_ADMIN_PASSWORD` equals a known placeholder, but it checks the
wrong string. The guard compares against `change_me_admin`, the dev/CI
default from the FEAT-021 spec and plan. The placeholder actually documented
in `.env.example` and `backend/.env.example` is
`REPLACE_WITH_A_REAL_ADMIN_PASSWORD`, and their comment states the seed
"refuses this documented placeholder password specifically", which is false.

Consequence: anyone who copies `.env.example` to `.env` without editing
`SEED_ADMIN_PASSWORD` gets an `ADMIN` account (email verified, active) whose
password is a public string from the repository. The seed runs on every
production deploy (`.github/workflows/build-deploy.yml`) and, since the dev
auto-seed change, on every dev backend start.

The admin upsert uses `update: {}`, so fixing the guard does not repair an
admin account already created with the placeholder: an existing account keeps
its password.

`seed.ts` has no tests, which is how the drift went unnoticed.

#### Acceptance criteria

- The seed refuses to run when `SEED_ADMIN_PASSWORD` equals
  `REPLACE_WITH_A_REAL_ADMIN_PASSWORD`; `change_me_admin` stays refused
- The placeholder value lives in one place, so the guard and `.env.example`
  cannot drift apart again (or a test pins them together)
- Tests cover `seedAdminUser`: missing email, missing password, each
  placeholder refused, valid password upserted with `ADMIN` role
- The `.env.example` comments match the actual behavior
- Production admin account checked: if it was ever seeded with the
  placeholder, its password is rotated

#### Resolution (2026-10-30)

`seedAdminUser` moved to `backend/prisma/seed-admin.ts` (kept under
`prisma/` because the production image copies `prisma/` but not `src/`).
`SEED_ADMIN_PASSWORD_PLACEHOLDERS` lists both refused values, and a test pins
it to the `SEED_ADMIN_PASSWORD` documented in both `.env.example` files.

The production admin check is automated instead of manual: before the upsert,
the seed compares an existing admin account's hash against every placeholder
and fails the seed if one matches. The seed runs on every production deploy,
so the next deploy fails loudly if the production admin was ever seeded with a
placeholder, and the password then has to be rotated by hand.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-011] Patch backend dependencies flagged critical by npm audit

- **type:** chore
- **id:** CHORE-011
- **milestone:** v2
- **status:** done
- **priority:** critical
- **domain:** backend
- **complexity:** XS
- **parent:** ~
- **depends-on:** ~
- **learning:** [npm audit triage]
- **labels:** [chore, domain:backend, priority:critical]

#### Description

The CI `npm audit --audit-level=critical` step on `backend/` started failing
on 2026-10-30 after new advisories were published: 2 critical (`proxy-addr`
IP spoofing via IPv4-mapped IPv6 trust subnets, `handlebars`) plus several
high ones on runtime packages (`body-parser`, `sharp`/librsvg, `multer`,
`nodemailer`, `mysql2`). The failure blocked every backend PR.

#### Acceptance criteria

- `npm audit --audit-level=critical` passes on `backend/`
- Only non-breaking updates (`npm audit fix`, no `--force`)
- Backend still builds and encodes through the real API

#### Resolution (2026-10-30)

`npm audit fix` updated `backend/package-lock.json` within the existing
semver ranges (`proxy-addr` 2.0.8, `handlebars` 4.7.10, `express` 5.3.0,
`body-parser` 2.4.0, `sharp` 0.35.5, `nodemailer` 10.3.1, `multer` 2.5.0,
`@nestjs/platform-express` 12.3.2, `prisma` 7.10.1). Remaining after the fix:
1 high (`brace-expansion` <=1.1.20) and 6 low (`deepmerge` via `jest-config`),
all dev-only tooling; `--force` would downgrade `jest` to 25, not justified.
The frontend audit has no critical finding (8 high, 3 moderate) and is left
for a separate item.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-012] Patch frontend dependencies flagged by npm audit

- **type:** chore
- **id:** CHORE-012
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** XS
- **parent:** ~
- **depends-on:** ~
- **learning:** [npm audit triage]
- **labels:** [chore, domain:frontend, priority:medium]

#### Description

`npm audit` on `frontend/` reported 11 vulnerabilities (8 high, 3 moderate,
no critical, so CI still passed) in `vite`, `undici`, `source-map-js`,
`brace-expansion`, `@vitest/mocker` and `vue-i18n`'s `@intlify/*` packages.

#### Acceptance criteria

- Every finding fixable without a major upgrade is fixed
- Frontend tests, typecheck and build pass; the dev UI still loads
- Findings that need a major upgrade get their own backlog item

#### Resolution (2026-10-30)

`npm audit fix` updated `frontend/package-lock.json` (`vite` 8.3.5 and
transitive packages). `npm audit fix` could not move the `vitest` pair, since
`@vitest/coverage-v8` pins an exact `vitest` peer version, so both were raised
to `^5.0.5` in `package.json`, which fixes `@vitest/mocker`.

Remaining: 4 high in `vue-i18n` 9.14.5 (`@intlify/core-base`,
`@intlify/shared`, `@intlify/message-compiler`), fixed only in `vue-i18n` 11,
a major upgrade. Tracked as CHORE-013.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [CHORE-013] Upgrade vue-i18n from 9 to 11

- **type:** chore
- **id:** CHORE-013
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [vue-i18n major upgrade]
- **labels:** [chore, domain:frontend, priority:medium]

#### Description

`npm audit` reports 4 high advisories on `vue-i18n` 9.14.5 and its
`@intlify/*` packages, fixed only in `vue-i18n` 11 (GHSA-8rc2-428q-7ww3:
`escapeParameter` does not escape named parameters when a list is also
passed; GHSA-83rm-6c8r-g728: XSS through `srcdoc` in translation messages).

Exposure today is low: the app does not use `escapeParameter`, and translation
messages are static strings from the repository, not user input. The upgrade
should still happen before FEAT-020 (French interface), which adds a second
locale and more messages on top of the current vue-i18n setup.

#### Acceptance criteria

- `vue-i18n` upgraded to 11, breaking changes from 9 to 10 to 11 handled
  (legacy API mode, message format and compilation changes)
- `npm audit` on `frontend/` reports no high or critical finding
- Frontend tests, typecheck and build pass; every view renders its English
  messages in the real dev UI

#### Resolution (2026-10-30)

`vue-i18n` raised to `^11.4.16` with no code change: the app only uses the
Composition API (`legacy: false`, `useI18n().t`) with named parameters, so none
of the 9 to 11 breaking changes (`tc`/`$tc` removal, Legacy API deprecation,
`v-t`) apply. `npm audit` on `frontend/` reports 0 vulnerabilities. Checked in
a headless browser logged in as admin: Encode, Decode, Key and Admin views
render their English messages with no raw keys and no console warnings, and a
parameterised message (`{email}`) is interpolated.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [REFACTOR-012] Design polish pass - critique, triage, fix

- **type:** refactor
- **id:** REFACTOR-012
- **milestone:** v2
- **status:** ready
- **priority:** medium
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-020
- **learning:** [critique-driven UI polish]
- **labels:** [refactor, domain:frontend, priority:medium]

#### Description

Polish the visual design of the whole frontend. The last design critique
(round 7, 14/40) predates REFACTOR-004..011, the key-size change (FEAT-022) and
the authentication and admin views (FEAT-023), which were never critiqued.
The current score is therefore unknown.

Approach:

1. Run `/impeccable critique` on every view at its current state (Encode,
   Decode, Key, Login, Register, Verify email, Admin users), desktop and
   mobile, in both English and French (French strings run 15 to 30% longer
   and surface overflows the English UI hides), and record the score.
2. Triage findings by domain, not only by severity: pure visual or layout
   fixes stay in this item; interaction or state bugs and anything touching
   the key or cryptogram format get their own backlog items.
3. Write each independently mergeable visual fix as its own child item
   (`parent: REFACTOR-012`) before implementing any, so the plan survives an
   interrupted session.
4. Re-run the critique after each batch of fixes, so the reported score always
   matches what is merged.

Known candidate to triage: in Encode's "existing key" mode, the size selector
has no effect (the key embeds its own size since FEAT-022) but is still shown
as editable. This is an interaction issue, so it gets its own item.

Stay within `docs/design-system.md` (tokens, typography, colour roles); any
change to the design system itself is documented there in both languages.

#### Acceptance criteria

- A fresh critique of every view is recorded, with its score
- Every finding is triaged into this item's children or a separate item
- Child items implemented, each on its own branch and PR
- A final critique after the last fix shows a higher score than the initial
  one, reported against the merged state
- `docs/design-system.md` and `docs/design-system.fr.md` updated if tokens or
  rules change
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-024] Localized emails and account-level language preference

- **type:** feat
- **id:** FEAT-024
- **milestone:** v2
- **status:** ready
- **priority:** low
- **domain:** backend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-020
- **learning:** [locale negotiation between client and server]
- **labels:** [feat, domain:backend, priority:low, milestone:v2]

#### Description

FEAT-020 keeps the language choice in the browser only (`localStorage`). The
backend does not know the user's language, so the verification email and every
API message (error details, weakness warnings) stay in English, even in the
French interface.

Store the preference on the account (a `locale` column on `User`), send it
from the frontend at registration and on change, and use it to localize
emails. API messages could be localized from the same preference or from the
request's `Accept-Language` header, to be decided in this item's design.

#### Acceptance criteria

- `User` has a `locale` preference, set at registration from the active
  interface language and updated when the user switches language while logged in
- Verification emails are sent in the user's language
- A decision is recorded for API messages (localized on the backend, or mapped
  to i18n keys on the frontend), and implemented
- When the browser choice and the account preference differ at login, the rule
  for which one wins is documented and tested
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-025] Help page - concept and settings

- **type:** feat
- **id:** FEAT-025
- **milestone:** v2
- **status:** done
- **priority:** medium
- **domain:** frontend
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-020
- **learning:** [build-time Markdown to Vue components]
- **labels:** [feat, domain:frontend, priority:medium, milestone:v2]

#### Description

There is no help page. Add a public `/help` view, reachable without logging
in, that explains the concept and every setting, in English and French.

Content: the principle (Hexahue alphabet, grid, dislocation by block
rotations), each setting (pivot block size, rotation sequence and direction,
reading order, cryptogram size), the key and why it can be reused, the GCD
weakness warning, and how to decode. First draft written from `CONTEXT.md`
and the code, then reviewed by the maintainer.

Storage, decided with the maintainer: one Markdown file per locale
(`src/content/help/en.md`, `fr.md`), compiled to Vue components at build time
with `unplugin-vue-markdown` (dev dependency only). No runtime Markdown parser
and no `v-html`, so nothing to sanitize. Short labels (page title, nav link)
stay in `en.json`/`fr.json`. Check plugin compatibility with Vite 8 first; if
it does not work, stop and discuss alternatives before picking another
approach.

#### Acceptance criteria

- `/help` is public, linked from the nav bar ("Help" / "Aide") on every view
- The page shows the Markdown content for the active locale and follows a
  language switch without reloading
- A test fails if a supported locale has no help file, or if the help files
  do not share the same heading structure
- Content covers the concept, every setting, the key, the weakness warning and
  decoding, reviewed by the maintainer
- Readable on mobile (no horizontal scroll at 390px)

#### Resolution (2026-10-31)

- Public `/help` view (`frontend/src/views/HelpView.vue`), linked from the nav
  bar ("Help" / "Aide") on every view, logged in or not.
- Content in `frontend/src/content/help/en.md` and `fr.md`, compiled to Vue
  components at build time by `unplugin-vue-markdown` (dev dependency). The
  view lazily loads the active locale's file (one chunk per language) and
  follows a language switch without reloading.
- Named anchors, added to the scope during planning for future contextual help
  links: each section has an explicit `{#anchor}` id (via `markdown-it-attrs`),
  identical in every locale. `frontend/src/content/help/sections.ts` exports
  the typed `HELP_SECTIONS` list for links such as
  `{ path: '/help', hash: '#pivot-block-size' }`; `help-files.spec.ts` fails if
  a locale file is missing or does not define exactly these anchors, in order.
  Opening `/help#anchor` scrolls to the section once the content has loaded,
  and stays on it after a language switch.
- Content checked against the code rather than `CONTEXT.md`, which still
  describes a message-length header and a key without the size: pivot block
  size range (1 to 255), sequence cycling over blocks, keyboard reordering,
  GCD rule (weak sizes still encode, the checkbox only hides the warning),
  case sizes in pixels, key-mode settings overriding the form, `?` for
  padding at the end of a decoded message. The example key is `HR1·0005`:
  the `HR1·57C3` example used in the READMEs and the `KeyCodec` JSDoc is not
  a valid key (out-of-range rotation sequence index), see FIX-002.
- The Markdown typographer is disabled so the help text keeps straight
  apostrophes, like the rest of the UI strings.
- A guard in `HelpView` ignores a help file that finishes loading after a newer
  language switch. Not covered by a test: both files load in order under
  Vitest, so a test could not reproduce the race.

Not done: contextual "?" links next to each setting, which can now target the
anchors. Tracked as FEAT-026.
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-026] Contextual help links next to each setting

- **type:** feat
- **id:** FEAT-026
- **milestone:** v2
- **status:** ready
- **priority:** low
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** FEAT-025
- **learning:** [accessible inline help affordances]
- **labels:** [feat, domain:frontend, priority:low, milestone:v2]

#### Description

The help page (FEAT-025) has stable, locale-independent anchors listed in
`frontend/src/content/help/sections.ts` (`HELP_SECTIONS`). Add a small help
link next to each setting of the Encode, Decode and Key forms (pivot block
size, rotation sequence, rotation direction, reading order, cryptogram size,
weakness warning, key field) that opens the matching section, for example
`{ path: '/help', hash: '#pivot-block-size' }`.

#### Acceptance criteria

- Each setting listed above has a help link targeting its `HELP_SECTIONS`
  anchor, typed so that an unknown anchor fails the typecheck
- Links have an accessible name naming the setting ("Help: pivot block size"),
  in both languages, and do not lose the form state when followed and when
  coming back
- Keyboard and screen reader users can reach and use the links
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FIX-002] Encode result shows the form size instead of the key size in "Existing key" mode

- **type:** fix
- **id:** FIX-002
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** frontend
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [single source of truth between client and server state]
- **labels:** [fix, domain:frontend, priority:high]

#### Description

In "Existing key" mode, the backend renders the cryptogram at the size stored
in the key (FEAT-022, "the key is authoritative") and ignores the `size` sent
with the request. The frontend still sends the form's size and stores it as
`result.size` (`frontend/src/stores/encode.ts`). When the form size differs
from the key's size, the result panel, the "Copy key and size" text and the
download file names show the wrong size. A user who decodes with that size
gets only `?` characters.

Example: a key encoding `small`, form left on `medium`. The image is drawn
with 8-pixel squares, the result says Medium, decoding with Medium fails.

Found by the FEAT-025 review. Related documentation bug: the example key
`HR1·57C3` in `README.md`, `README.fr.md` and the `KeyCodec` JSDoc is not a
valid key (its payload unpacks to rotation sequence index 27, only 0 to 23
exist), so pasting it fails.

#### Acceptance criteria

- In "Existing key" mode, the result size is the key's size, never the form's
- The size selector is hidden or disabled in "Existing key" mode, or shows the
  key's size, so the form cannot contradict the key
- A regression test covers a key whose size differs from the form's default
- The `HR1·57C3` example is replaced with a valid key everywhere it appears
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FIX-003] Backlog auto-promotion PR can never merge under the CI-required ruleset

- **type:** fix
- **id:** FIX-003
- **milestone:** v2
- **status:** done
- **priority:** high
- **domain:** infra
- **complexity:** S
- **parent:** ~
- **depends-on:** ~
- **learning:** [GitHub auto-merge, required status checks vs skip ci]
- **labels:** [fix, domain:infra, priority:high]

#### Description

When an item's dependencies become `done`, `sync-backlog.js` promotes it to
`ready` by committing `BACKLOG.md` to a branch, opening a PR and merging it
right away. Since the `protect-main` ruleset requires the "CI status" check
(added during the October CI homogenization), that merge is refused: the
commit message contained `[skip ci]`, so CI never ran on the PR and the
required check never arrived. First seen on 2026-10-31, when merging FEAT-025
promoted FEAT-026: the run failed with "Required status check "CI status" is
expected", and its rerun opened a duplicate PR (#278, #279).

#### Acceptance criteria

- The auto-promotion commit no longer skips CI
- The PR is merged by GitHub auto-merge once "CI status" passes, not merged
  immediately; the rest of the sync goes on without waiting
- A rerun closes earlier auto-promotion PRs still open (and their branches)
  instead of opening duplicates
- Tests cover the three behaviours without calling the GitHub API

#### Resolution (2026-10-31)

`commitPromotionsViaPullRequest` now drops `[skip ci]`, enables auto-merge
(squash) through the `enablePullRequestAutoMerge` GraphQL mutation, and first
closes superseded `chore/backlog-auto-promote-*` PRs and deletes their
branches. The script only runs `main()` when executed directly
(`require.main === module`) and exports the function, so
`.github/scripts/sync-backlog.test.js` (`node --test .github/scripts/`, no
dependency) covers it with a mocked Octokit. "Allow auto-merge" enabled in the
repository settings. A PR touching only `BACKLOG.md` skips the backend and
frontend jobs, so "CI status" passes within seconds.

Not run by CI: the script's tests run locally only, since the repository has
no CI job for `.github/scripts/`.
<!-- ITEM:END -->

