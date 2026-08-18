# FEAT-015 Decode View Design Spec

**Status:** Approved by the user (2026-08-18), ready for writing-plans.

**Backlog item:** FEAT-015, `status: ready`, `depends-on: FEAT-012` (done), `domain: frontend`, `complexity: M`.

## Context

FEAT-015 is the second frontend feature. Unlike FEAT-014 (which had to stand up
routing, the HTTP client, and the Pinia-store-per-view pattern from a blank
scaffold), this feature reuses all of that shared infrastructure as-is:
`vue-router` already routes `/decode` to `DecodeView.vue` (currently a 3-line
stub), `src/api/client.ts`'s `postJson`/`getJson`/`ApiError` need no changes,
and `useDecodeStore` follows the exact shape established by `useEncodeStore`.
`isValidKeyFormat` (`src/utils/key-format.ts`, built during FEAT-014) is reused
verbatim for this view's own client-side key check.

The backend endpoint this view consumes is complete: `POST /api/decode`
(FEAT-012). Its request DTO (`backend/src/api/dto/decode-request.dto.ts`)
requires all four fields - `cryptogram` (string), `format` (`'png'|'svg'`),
`key` (string), `size` (`'small'|'medium'|'large'`) - and its service
(`backend/src/api/decode.service.ts`) decodes `cryptogram` as
`Buffer.from(dto.cryptogram, 'base64')` when `format === 'png'`, or as a raw
SVG string when `format === 'svg'`. The response is `{ message: string }`.

The user uploads a cryptogram file (PNG or SVG, via click-to-browse or
drag-and-drop) and enters the HR key that was used to encode it, plus the
`size` it was rendered at (required - `size` determines `casePixels` on the
backend, and a mismatch fails with a dimensions error). The view displays the
decoded plaintext.

## Decision 1: `size` is a manual selector, not auto-detected

`size` must exactly match the value used at encode time, or the backend
rejects the request with a dimensions-mismatch error. **Decided:** a manual
`small`/`medium`/`large` selector defaulting to `medium`, mirroring the
encode view's own `size` field - the user adjusts it if decoding fails. An
auto-detection approach (trying all three sizes until one parses) was
considered and rejected: it adds real complexity (multiple sequential API
calls, more store state to track which attempt is "current") for UX benefit
that's marginal given there are only three values and a clear error message
tells the user what went wrong.

## Decision 2: native drag-and-drop, no library

Unlike FEAT-014's rotation-sequence picker (where `vuedraggable` was worth
its dependency cost for real reordering logic and touch support), a file
drop zone is a much shallower interaction: a `dragover`/`drop` event pair
toggling a visual state and reading `event.dataTransfer.files`. Native HTML5
drag-and-drop handles this fully; no dependency earns its cost here.

## Decision 3: file format detected by extension, not MIME type

Matches the test contract's own wording ("rejects files with unsupported
extensions and shows an error"). The uploaded `File`'s `.name` is checked
against `.png`/`.svg` (case-insensitive) on selection, before any read or
API call.

## Architecture

- `frontend/src/stores/decode.ts` (`useDecodeStore`): state `file: File | null`
  (format is never stored separately - it's derived from `file.name`'s
  extension where needed, avoiding two fields that could drift out of sync),
  `keyInput: string`, `size: 'small' | 'medium' | 'large'` (default
  `'medium'`), `status: 'idle' | 'loading' | 'success' | 'error'`,
  `result: string | null`, `errorMessage: string | null`,
  `errorCode: 'network' | 'unknown' | null` (mirrors `useEncodeStore`'s
  post-FEAT-014-review error shape exactly). Actions:
  - `submit()`: derives `format` from `file.name`'s extension (`.png` ->
    `'png'`, `.svg` -> `'svg'`), reads `file` via `FileReader`
    (`readAsDataURL` for PNG, stripping the `data:image/png;base64,` prefix
    to get the raw base64 payload the backend expects; `readAsText` for SVG,
    used as-is), builds `{ cryptogram, format, key: keyInput, size }`, calls
    `postJson<{ message: string }>('/decode', payload)`, and follows the same
    status/result/errorMessage/errorCode transitions as `useEncodeStore.submit()`.
  - `reset()`: same `Object.assign(this, initialState())` pattern.
- `frontend/src/components/DecodeUploadArea.vue`: a `v-model`-compatible
  component bound directly to `store.file` from the parent
  (`<DecodeUploadArea v-model="store.file" />`, same direct-binding pattern
  FEAT-014 used for `<RotationSequencePicker v-model="store.rotationSequence" />`
  - no separate store action needed, since the component only ever emits an
    already-valid `File`). Renders a hidden
  `<input type="file" accept=".png,.svg">` triggered by a visible "browse"
  button, plus a drop zone (`@dragover.prevent`, `@dragleave`, `@drop.prevent`)
  toggling an `isDragging` class for visual feedback. On a valid selection
  (click or drop), emits the `File` (`update:modelValue`) and displays its
  `.name`. On an invalid extension, shows an inline error and does not emit
  (previous valid file, if any, stays selected).
- `frontend/src/components/DecodeParamsForm.vue`: renders `DecodeUploadArea`,
  the key input (with the same client-side `isValidKeyFormat` check pattern
  as `EncodeParamsForm`'s key mode), the `size` selector, and the submit
  button (disabled while loading, or while no file is selected, or while the
  key is empty/invalid).
- `frontend/src/views/DecodeView.vue`: renders `DecodeParamsForm`, the error
  message (`v-if="store.status === 'error'"`, same `errorMessage ?? t(...)`
  resolution as `EncodeView`), and the decoded message
  (`v-if="store.status === 'success'"`) directly inline - no separate result
  component, since there is only one string to display (no previews,
  downloads, or warnings to render).

## Error handling

- **Client-side file extension check**: on selection (click or drop), before
  any read or network call - inline error in `DecodeUploadArea`.
- **Client-side key format check**: same `isValidKeyFormat` reuse as
  `EncodeParamsForm`'s key mode, checked before submit.
- **Backend errors and network failures**: normalized through `ApiError`
  (`code: 'http' | 'network'`) exactly as `useEncodeStore` does post-FEAT-014-
  review - HTTP-coded errors keep the backend's own message verbatim,
  network/unknown errors resolve through `errors.network`/`errors.unknown`
  i18n keys.
- **Loading state**: submit button disabled and a loading indicator shown
  while `status === 'loading'`.

## Testing strategy

- `frontend/src/components/DecodeUploadArea.spec.ts`: file selection via the
  hidden input's `change` event, `dragover`/`drop` event handling, extension
  rejection (using the shared `MOCK_PNG_FILE`/`MOCK_SVG_FILE` fixtures plus a
  new invalid-extension `File`), filename display after a valid selection.
- `frontend/src/stores/decode.spec.ts`: mirrors `encode.spec.ts` - payload
  construction differs correctly by format (base64-stripped for PNG, raw text
  for SVG), status/result/errorCode transitions through success and failure,
  `reset()` restores defaults. `api/client.ts` is mocked (`postJson`), same
  pattern as `encode.spec.ts`.
- `frontend/src/views/DecodeView.spec.ts`: integration test covering
  `docs/tests/frontend.md` section 3 (`DecodeView`) and section 4 (`useDecodeStore`)
  in full - mounted with a real Pinia store and a mocked `api/client.ts`,
  mirroring `EncodeView.spec.ts`'s established pattern (including the lesson
  from FEAT-014's final review: tests must prove controls are actually bound,
  not just rendered with their default values).
- Fixtures added to the existing shared `src/__fixtures__/frontend.fixtures.ts`
  (already holding the encode-related ones): `MOCK_DECODE_RESPONSE`,
  `MOCK_PNG_FILE`, `MOCK_SVG_FILE` - the three decode-related fixtures named
  in `docs/tests/frontend.md`'s Fixtures section.
- No dedicated `DecodeParamsForm.spec.ts` (same reasoning as
  `EncodeParamsForm`): its wiring is verified through `DecodeView.spec.ts`.
- House rule carried over: no bare `for`/`while`/`if` in test bodies, use
  `it.each` for parameterized cases (e.g. the PNG vs. SVG payload-shape test).

## i18n

Every user-visible string (upload area labels/errors, key/size field labels,
submit button, decoded-message label, error messages) routes through a
`vue-i18n` key under a `decode.*` namespace in `src/locales/en.json`
(`decode.upload.*`, `decode.form.*`, `decode.result.*`), mirroring the
`encode.*` structure from FEAT-014.

## Explicitly out of scope for this feature

- File size limits on upload - not required by the backlog's acceptance
  criteria; can be added later if real-world file sizes prove it necessary.
- Any visual preview of the uploaded file before submission - only the
  filename is required to be shown (per the test contract).
- Visual design/styling polish - REFACTOR-001, same carve-out as FEAT-014.
- French interface - FEAT-020, same carve-out as FEAT-014.
- Any change to `EncodeView.vue`/`KeyView.vue` beyond none - this feature
  touches neither.
