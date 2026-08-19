# FEAT-016 Key View Design Spec

**Status:** Approved by the user (2026-08-19), ready for writing-plans.

**Backlog item:** FEAT-016, `status: ready`, `depends-on: FEAT-013` (done), `domain: frontend`, `complexity: S`.

## Context

FEAT-016 is the third and last of the three V1 frontend views. It reuses all
shared infrastructure built in FEAT-014 and confirmed unchanged by FEAT-015:
`vue-router` already routes `/key` to `KeyView.vue` (currently a 3-line
stub), `src/api/client.ts`'s `postJson`/`getJson`/`ApiError` need no changes,
and `useKeyStore` follows the store-per-view shape established by
`useEncodeStore`/`useDecodeStore`. `isValidKeyFormat`
(`src/utils/key-format.ts`) and `RotationSequencePicker.vue` (both built
during FEAT-014) are reused verbatim.

The backend endpoints this view consumes are complete (FEAT-013):

- `POST /api/key/generate` (`backend/src/api/key.controller.ts`): body is
  `KeyGenerateRequestDto` - every field independently optional
  (`pivotBlockSize?: number`, `rotationSequence?: number[]` as **permutation
  indices 0-3**, `rotationDirection?: 'cw'|'ccw'`, `readingOrder?: string`).
  Response: `{ key: string }`.
- `GET /api/key/parse?key=...` (`KeyParseQueryDto`): response is
  `KeyParseResult` - `{ pivotBlockSize: number, rotationSequence: number[]`
  (**already converted to degrees**, e.g. `[0, 90, 180, 270]`, unlike the
  generate endpoint's indices)`, rotationDirection: 'cw'|'ccw', readingOrder:
  string }`. A malformed or invalid key throws `BadRequestException` (400).

The view has two independent sections: a key generator (parameters in, key
out) and a key parser (key in, parameters out). Confirmed with the user: each
section gets its own child component (`KeyGeneratorForm.vue`,
`KeyParserForm.vue`), matching FEAT-014's form/result split rather than one
large `KeyView.vue`.

## Architecture

- `frontend/src/stores/key.ts` (`useKeyStore`): two independent state slices
  in one store, so generating and parsing never interfere with each other's
  status/result/error - each mirrors `useEncodeStore`'s post-FEAT-014-review
  error shape exactly (`errorMessage: string | null`,
  `errorCode: 'network' | 'unknown' | null`).

  ```typescript
  export type RotationDirection = 'cw' | 'ccw'
  export type KeyStatus = 'idle' | 'loading' | 'success' | 'error'

  /** Mirrors backend/src/api/key.service.ts's KeyParseResult. */
  export interface KeyParseResult {
    pivotBlockSize: number
    rotationSequence: number[] // degrees, e.g. [0, 90, 180, 270]
    rotationDirection: RotationDirection
    readingOrder: string
  }

  interface KeyState {
    // Generator
    pivotBlockSize: number
    rotationSequence: number[] // permutation indices 0-3, e.g. [0, 1, 2, 3]
    rotationDirection: RotationDirection
    readingOrder: ReadingOrder
    generateStatus: KeyStatus
    generatedKey: string | null
    generateErrorMessage: string | null
    generateErrorCode: 'network' | 'unknown' | null

    // Parser
    keyInput: string
    parseStatus: KeyStatus
    parsedParams: KeyParseResult | null
    parseErrorMessage: string | null
    parseErrorCode: 'network' | 'unknown' | null
  }
  ```

  Defaults for the generator fields match `useEncodeStore`'s initial state
  (`pivotBlockSize: 5`, `rotationSequence: [0, 1, 2, 3]`,
  `rotationDirection: 'cw'`, `readingOrder: 'LR-TB'`) for consistency across
  views. `keyInput` defaults to `''`.

  Actions:
  - `generate()`: sets `generateStatus = 'loading'`, `generatedKey = null`,
    clears prior generate error fields; calls
    `postJson<{ key: string }>('/key/generate', { pivotBlockSize,
    rotationSequence, rotationDirection, readingOrder })`; on success sets
    `generatedKey = response.key`, `generateStatus = 'success'`; on failure
    follows the same `ApiError.code === 'http' | 'network'` branching as
    `useEncodeStore.submit()`, `generateStatus = 'error'`.
  - `parse()`: sets `parseStatus = 'loading'`, `parsedParams = null`, clears
    prior parse error fields; calls `getJson<KeyParseResult>('/key/parse', {
    key: keyInput })`; on success sets `parsedParams = response`,
    `parseStatus = 'success'`; on failure same `ApiError` branching,
    `parseStatus = 'error'`. Client-side format validation
    (`isValidKeyFormat`) is not the store's job - the component's
    `canSubmit`/equivalent computed blocks the call before `parse()` is
    ever invoked, same separation of concerns as `EncodeParamsForm`'s key
    mode.
  - `reset()`: `Object.assign(this, initialState())`, used from
    `KeyView.vue`'s `onUnmounted` (same pattern as `DecodeView.vue`).

- `frontend/src/components/KeyGeneratorForm.vue`: renders `pivotBlockSize`
  (number input, min 1 max 255), `RotationSequencePicker` bound to
  `store.rotationSequence` (same component, same `number[]` index shape -
  no adaptation needed), `rotationDirection` select, `readingOrder` select
  (`READING_ORDERS` from `constants/reading-orders.ts`), and a "Generate"
  button (disabled while `generateStatus === 'loading'` or
  `pivotBlockSize` is out of `[1, 255]` - mirrors `EncodeParamsForm`'s
  `canSubmit` bound check). On success, displays `store.generatedKey` in a
  `<code>` element next to a copy button reusing `EncodeResultPanel.vue`'s
  `copyKey`/`copyState` (`'idle' | 'copied' | 'error'`) pattern exactly -
  `navigator.clipboard.writeText`, 2-second auto-reset to `'idle'`. On
  error, displays `generateErrorMessage ?? t('errors.network'/'errors.unknown')`
  depending on `generateErrorCode`.

- `frontend/src/components/KeyParserForm.vue`: renders a text input bound to
  `store.keyInput`, a "Parse" button, and the parsed result once available.
  Client-side format check via `isValidKeyFormat(store.keyInput)`
  (identical reuse to `EncodeParamsForm`'s key-mode check) - if it fails,
  shows an inline `role="alert"` error and the button click does not call
  `store.parse()`. If the client-side check passes but the backend still
  rejects the key (400 - e.g. bad checksum, unsupported version),
  `parseErrorMessage` displays the backend's own message verbatim (same
  `ApiError.code === 'http'` handling as everywhere else). On success,
  renders `parsedParams.pivotBlockSize`, each `rotationSequence` entry as
  `N°` (already in degrees from the backend - no conversion needed, unlike
  the generator's index-based input), `parsedParams.rotationDirection`, and
  `parsedParams.readingOrder` as a labeled list.

- `frontend/src/views/KeyView.vue`: renders `KeyGeneratorForm` and
  `KeyParserForm` with section headings, no logic of its own beyond
  `onUnmounted(() => store.reset())` (matching `DecodeView.vue`'s
  established pattern) - replaces the current 3-line stub.

## Error handling

- **Client-side key format check (parser only)**: same `isValidKeyFormat`
  reuse as `EncodeParamsForm`'s key mode and `DecodeParamsForm`'s key field,
  checked before `store.parse()` is called - inline error in
  `KeyParserForm`, i18n key `key.parser.form.key.formatError`.
- **Client-side range check (generator only)**: `pivotBlockSize` bounds
  `[1, 255]` disable the Generate button, same pattern as
  `EncodeParamsForm.canSubmit`. No separate error message needed - the
  `<input type="number" min="1" max="255">` constraints plus a disabled
  button are sufficient, matching the existing Encode form's treatment of
  the same field.
- **Backend errors and network failures**: normalized through `ApiError`
  (`code: 'http' | 'network'`) exactly as `useEncodeStore`/`useDecodeStore`
  do - HTTP-coded errors keep the backend's own message verbatim,
  network/unknown errors resolve through the existing shared
  `errors.network`/`errors.unknown` i18n keys (no new keys needed for this
  case).
- **Loading state**: each section's own button disabled and a loading label
  shown while its own `*Status === 'loading'` - the two sections never share
  a loading state, since they're independent actions.

## Testing strategy

Follows the contract already written in `docs/tests/frontend.md` §5
(`KeyView`) and §6 (`useKeyStore`) exactly - this section covers the
mechanics, not a restatement of every assertion:

- `frontend/src/stores/key.spec.ts`: mirrors `encode.spec.ts`/`decode.spec.ts`
  - `generate()` and `parse()` tested independently (status transitions,
    stored result, stored error, previous-result clearing on a new
    dispatch of the *same* action - verifying the *other* section's state
    is untouched). `postJson`/`getJson` mocked via `vi.mock('../api/client')`.
- `frontend/src/components/KeyGeneratorForm.spec.ts`: renders all controls
  with explicit `name="..."` selectors (lesson carried from FEAT-014's
  final review - ambiguous `'select'` selectors silently matched the wrong
  element), triggers `store.generate()` on click, displays the returned key
  and copy button, displays the error state.
- `frontend/src/components/KeyParserForm.spec.ts`: renders the key input
  and Parse button, blocks submission and shows the inline error for
  `MALFORMED_KEY` without calling `store.parse()`, displays all decoded
  fields on success, displays the API error message on a 400 response.
- `frontend/src/views/KeyView.spec.ts`: integration test assembling both
  child components with a real Pinia store and mocked `api/client.ts`,
  covering `docs/tests/frontend.md` §5-6 in full, plus the i18n check (no
  raw string literals outside the locale file) and `onUnmounted` calling
  `store.reset()` (mirrors `DecodeView.spec.ts`'s equivalent test).
- Fixtures added to the existing shared `src/__fixtures__/frontend.fixtures.ts`:
  `MOCK_KEY_GENERATE_RESPONSE`, `MOCK_KEY_PARSE_RESPONSE`, `MALFORMED_KEY` -
  the three named in `docs/tests/frontend.md`'s Fixtures section.
- House rule carried over: no bare `for`/`while`/`if` in test bodies, use
  `it.each` for parameterized cases.
- Real functional test after implementation (per
  `feedback_functional_test_per_feat.md`): `docker-compose up` against a
  real backend, generate a key through the UI, then paste that exact key
  into the parser and verify the round-trip reproduces the same parameters
  that were submitted to the generator.

## i18n

Every user-visible string routes through a `vue-i18n` key under a `key.*`
namespace in `src/locales/en.json`, mirroring `encode.*`/`decode.*`'s
structure: `key.generator.title`, `key.generator.form.*`,
`key.generator.result.*` (`copy`/`copied`/`copyError`, matching
`encode.result.copy*` verbatim), `key.parser.title`, `key.parser.form.*`,
`key.parser.result.*`. The existing `nav.key: "Key"` entry is already in
place from FEAT-014 and needs no change. Network/unknown error messages
reuse the existing shared `errors.network`/`errors.unknown` keys - no new
keys for that case.

## Explicitly out of scope for this feature

- Auto-parsing as the user types in the parser's key field - the test
  contract specifies a button click triggers the parse call; no debounced
  live-parse.
- Any persistence of generated/parsed history (e.g. a list of previously
  generated keys) - not required by the backlog's acceptance criteria.
- Visual design/styling polish - REFACTOR-001, same carve-out as
  FEAT-014/015.
- French interface - FEAT-020, same carve-out as FEAT-014/015.
- Any change to `EncodeView.vue`/`DecodeView.vue` beyond none - this
  feature touches neither.
- The Express body-size limit bug (`project_backend_body_size_limit.md`) -
  unrelated to this feature (that bug affects `/decode` payload size, not
  `/key/generate` or `/key/parse`, both of which have tiny payloads).
