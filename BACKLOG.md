# Backlog — HexaRot

## Meta
sync-version: 1
last-updated: 2026-03-23

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
- **status:** ready
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

The key is encoded as a compact base36 string prefixed with `HR` (e.g. `HR1·57C3`).
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
- **priority:** critical
- **domain:** renderer
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-007, FEAT-008
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

The header row is rendered above the grid. The Hexahue standard colour palette is used.

#### Acceptance criteria

- Output is a valid PNG binary buffer
- All three case sizes produce images with correct pixel dimensions
- Colours match the Hexahue standard palette values exactly
- Header row is visible and correctly positioned above the grid
- Renderer implements the `Renderer` interface
- Integration test: encode a known short message, render to PNG, verify output
  dimensions match expected values
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-010] SVG renderer

- **type:** feat
- **id:** FEAT-010
- **milestone:** v1
- **status:** backlog
- **priority:** critical
- **domain:** renderer
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-007, FEAT-008
- **learning:** [SVG coordinate system, SVG rect elements, native string-based SVG generation without DOM, SVG viewBox]
- **labels:** [feat, domain:renderer, priority:critical, milestone:v1]

#### Description

Implement `SvgRenderer`, a concrete implementation of the `Renderer` interface, using
native SVG string generation (no DOM library). The renderer takes a fully rotated colour
grid, a case size option, and outputs an SVG string.

The SVG must be well-formed, self-contained, and renderable in a browser without
additional assets. Case sizes follow the same pixel values as the PNG renderer.

#### Acceptance criteria

- Output is a valid, well-formed SVG string
- SVG is self-contained (no external references)
- All three case sizes produce SVG with correct viewBox dimensions
- Colours match the Hexahue standard palette values exactly
- Header row is present and correctly positioned
- Renderer implements the `Renderer` interface
- Integration test: encode a known short message, render to SVG, verify viewBox
  dimensions and presence of correct number of `<rect>` elements
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-011] Encode API endpoint

- **type:** feat
- **id:** FEAT-011
- **milestone:** v1
- **status:** backlog
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
- **status:** backlog
- **priority:** critical
- **domain:** api
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-011
- **learning:** [image parsing with Sharp, base64 decoding in Node.js, SVG parsing strategies]
- **labels:** [feat, domain:api, priority:critical, milestone:v1]

#### Description

Implement the `POST /decode` endpoint. The endpoint accepts a cryptogram (PNG or SVG)
and a key, reads the metadata header to determine message length, applies inverse
rotations, and returns the decoded plaintext.

Request body:
- `cryptogram: string` — base64-encoded PNG or SVG string
- `format: 'png' | 'svg'`
- `key: string` — the HR key

Response:
- `message: string` — the decoded plaintext

#### Acceptance criteria

- Endpoint correctly decodes a cryptogram produced by the encode endpoint
- Round-trip test: encode a message, decode the output, verify original message is
  recovered
- Malformed key returns 400 with a descriptive error
- Malformed cryptogram returns 400 with a descriptive error
- Missing required fields return 400
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-013] Key generation API endpoint

- **type:** feat
- **id:** FEAT-013
- **milestone:** v1
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-016] Frontend — key view

- **type:** feat
- **id:** FEAT-016
- **milestone:** v1
- **status:** backlog
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
- **status:** ready
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
- **status:** backlog
- **priority:** high
- **domain:** cipher
- **complexity:** M
- **parent:** ~
- **depends-on:** FEAT-002, FEAT-004, FEAT-006, FEAT-007, FEAT-008
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
- **status:** backlog
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
- Score interpretation is explained in the UI (tooltip or help text)
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-019] Spiral reading order

- **type:** feat
- **id:** FEAT-019
- **milestone:** v2
- **status:** backlog
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
- **status:** backlog
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
<!-- ITEM:END -->

<!-- ITEM:BEGIN -->
### [FEAT-021] User authentication — registration, token issuance and validation

- **type:** feat
- **id:** FEAT-021
- **milestone:** v2
- **status:** ready
- **priority:** medium
- **domain:** api
- **complexity:** L
- **parent:** ~
- **depends-on:** CHORE-004
- **learning:** [JWT token design, token expiry and refresh strategies, NestJS Guards, bcrypt password hashing, RGPD considerations for user data]
- **labels:** [feat, domain:api, priority:medium, milestone:v2]

#### Description

Implement user registration and token-based authentication. A user registers with an
email and password. On login, a time-limited JWT token is issued. Protected API
endpoints validate the token via a NestJS Guard.

Token lifetime and refresh strategy to be defined at implementation time.

#### Acceptance criteria

- User can register with email + password
- Password is hashed (bcrypt), never stored in plaintext
- Login returns a JWT with a defined expiry
- Protected endpoints reject requests without a valid token
- Expired tokens are rejected with a 401 response
- Registration rejects duplicate email addresses
<!-- ITEM:END -->
