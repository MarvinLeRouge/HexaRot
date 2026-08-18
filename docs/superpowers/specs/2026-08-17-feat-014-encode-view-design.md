# FEAT-014 Encode View Design Spec

**Status:** Approved by the user (2026-08-17), ready for writing-plans.

**Backlog item:** FEAT-014, `status: ready`, `depends-on: FEAT-011` (done), `domain: frontend`, `complexity: L`.

## Context

FEAT-014 is the first frontend feature built this session. The frontend project
(bootstrapped in CHORE-002) is currently a blank Vite scaffold: `App.vue` still
renders the default `HelloWorld` component, there is no router, no HTTP client, no
Pinia store, `src/locales/en.json` is empty, and there are zero frontend tests despite
Vitest being installed. `EncodeView.vue`/`DecodeView.vue`/`KeyView.vue` exist only as
3-line stubs.

Because the three planned frontend views (FEAT-014/015/016) all need the same
foundational pieces (routing between them, a way to call the backend, a consistent
state-management pattern), and none of that infrastructure has its own backlog item,
this feature's scope explicitly includes standing it up once, alongside the encode
view itself - FEAT-015 and FEAT-016 will consume it without repeating the setup.

The backend API this view consumes is complete: `POST /api/encode` (FEAT-011),
`POST /api/key/generate` + `GET /api/key/parse` (FEAT-013), `POST /api/decode`
(FEAT-012).

## Decision 1: fetch, not axios

The frontend makes a small number of simple JSON HTTP calls with no current need for
interceptors, request cancellation, or automatic retries. Adding axios as a dependency
for capability that isn't used yet does not serve "professional" - it adds bundle size
and maintenance surface for zero present benefit. **Decided: native `fetch()`**, wrapped
in a small typed helper (see Architecture below). If FEAT-021 (user authentication)
later needs interceptor-style token attachment, axios can be added then at low cost -
not preemptively.

## Decision 2: vue-router, classic routes

**Decided:** install `vue-router`, with three top-level routes (`/encode`, `/decode`,
`/key`) and a redirect from `/` to `/encode`. This gives bookmarkable/shareable URLs
and a natural extension point for later route guards (FEAT-021), over a simpler
reactive view-switcher that would need migrating later if routing becomes necessary.

## Decision 3: rotation sequence picked via drag-and-drop, using vuedraggable

The rotation sequence is a permutation of `[0,1,2,3]` (indices into rotation angles
`[0, 90, 180, 270]`). **Decided:** present it as a drag-and-drop reorderable list of
the four angles, using the `vuedraggable` library (a well-maintained Vue wrapper
around SortableJS, ~13KB gzip, includes basic touch and keyboard support) rather than
a hand-rolled native HTML5 drag-and-drop implementation. Unlike the fetch/axios
decision, this is a case where an existing, well-tested library is worth the small
dependency cost - a custom implementation would need to reinvent touch and
accessibility handling that already work well in a mature library, for real UX benefit
(seeing the rotation order directly rather than picking four independent dropdowns).

## Decision 4: weakness override is opt-in, not a retry flow

`validateParams()` (backend, FEAT-003) **never blocks encoding** - a weak
`pivotBlockSize` always still produces a valid cryptogram, just annotated with
warnings in the response. `overrideWeaknessWarning` only controls whether the backend
includes those warnings in the response at all (`encode.service.ts`:
`warnings = validation.status === 'weak' ? validation.warnings : []` - an
`'overridden'` status yields an empty warnings array). Consequently there is no
"blocked, please retry" flow to design: `overrideWeaknessWarning` is exposed as a
single opt-in checkbox ("suppress weakness warnings") sent with the initial request.
If unchecked and the parameters are weak, the response's `warnings` array is shown
prominently alongside the (still successful) result, per the backlog's acceptance
criterion. If checked, no warning is shown even for weak parameters.

## Decision 5: this feature ships its own test coverage

Following the same precedent set by every backend feature this session (FEAT-011/012/013):
FEAT-014 ships with Vitest + `@vue/test-utils` component/store tests covering its own
code, added as this feature's own responsibility rather than deferred entirely to
TEST-003 (a separate, broader, not-yet-started backlog item - the frontend's analogue
to the backend's TEST-001/TEST-002 split). `@vue/test-utils` is added as a new
devDependency (not currently installed).

## Architecture

**Shared infrastructure (this feature, reused by FEAT-015/016):**

- `vue-router` (new dependency). `src/router/index.ts` defines routes `/encode`,
  `/decode`, `/key`, with `/` redirecting to `/encode`. `main.ts` registers the router.
- `src/layouts/AppLayout.vue` - a simple navigation bar linking the three routes,
  wrapping a `<router-view>`. `App.vue` is rewritten to render this layout instead of
  the scaffold's `HelloWorld` (which is deleted, along with the now-unused
  `assets/vue.svg`/`assets/hero.png` if confirmed unused elsewhere).
- `src/api/client.ts` - a small `fetch()` wrapper: resolves the base URL from
  `import.meta.env.VITE_API_BASE_URL` (falling back to `/api` for the dev-proxy case),
  serializes the request body as JSON, parses the JSON response, and on a non-2xx
  status throws a typed `ApiError` carrying the backend's error message. One exported
  function per HTTP verb shape needed (`postJson<TResponse>(path, body)`,
  `getJson<TResponse>(path, query?)`), used by all three views' stores.
- `vite.config.ts` - adds a dev-server proxy: `/api` -> `http://localhost:3000`
  (matches the backend's `PORT` default and `app.setGlobalPrefix('api')`), so the
  frontend dev server needs no CORS configuration to reach the backend locally.
- `docker-compose.yml` - the `frontend` service gains a `VITE_API_BASE_URL` environment
  variable (pointing at the `backend` service's Docker network address) for the
  containerized case, where the Vite dev-server proxy doesn't apply the same way as a
  bare `vite dev` process reaching `localhost`.
- `vuedraggable` (new dependency) - installed for `RotationSequencePicker.vue` below,
  available to FEAT-015/016 if they ever need reorderable lists too (they currently
  don't).

**Encode-view-specific pieces:**

- `src/stores/encode.ts` (Pinia store, `useEncodeStore`): holds all form state
  (`mode: 'params' | 'key'`, `message`, `pivotBlockSize`, `rotationSequence`,
  `rotationDirection`, `readingOrder`, `size`, `keyInput`, `overrideWeaknessWarning`),
  request lifecycle state (`status: 'idle' | 'loading' | 'success' | 'error'`,
  `result: EncodeResult | null`, `errorMessage: string | null`), and two actions:
  `submit()` (builds the request payload from the current mode - either the individual
  parameter fields or `{ key: keyInput }` - calls `api/client.ts`'s `postJson`, and
  updates `status`/`result`/`errorMessage`) and `reset()` (returns to the initial
  default state for encoding a new message). Default field values: `pivotBlockSize: 5`,
  `rotationSequence: [0,1,2,3]`, `rotationDirection: 'cw'`, `readingOrder: 'LR-TB'`,
  `size: 'medium'`.
- `src/views/EncodeView.vue` - the routed page component. Renders
  `EncodeParamsForm.vue`, and conditionally `EncodeResultPanel.vue` (on
  `status === 'success'`) or an error message (on `status === 'error'`), reading all
  state from `useEncodeStore()`.
- `src/components/EncodeParamsForm.vue` - the form: a mode toggle
  ("New parameters" / "Existing key"); when in `'params'` mode, the message field plus
  `pivotBlockSize` (number input), `RotationSequencePicker`, `rotationDirection` (select:
  cw/ccw), `readingOrder` (select, the 8 `READING_ORDERS` values), `size` (select:
  small/medium/large), and the `overrideWeaknessWarning` checkbox; when in `'key'`
  mode, the message field plus a single key text input (with the lightweight client-side
  format check from Decision-adjacent "Error handling" below). A submit button, disabled
  while `status === 'loading'`.
- `src/components/RotationSequencePicker.vue` - wraps `vuedraggable` around the four
  rotation angles (`[0, 90, 180, 270]`), emits the current order as a `number[]` of
  indices (`update:modelValue`, standard `v-model` pattern) back to the parent/store.
- `src/components/EncodeResultPanel.vue` - given an `EncodeResult` prop (`png`, `svg`,
  `key`, `warnings`, `unknownChars`), renders: the PNG preview (`<img :src="'data:image/png;base64,' + png">`),
  the SVG preview (`v-html`, since the SVG string is trusted - it comes only from this
  project's own backend, never from user-supplied content), the HR key with a "copy to
  clipboard" button, a warnings list (shown only if non-empty, styled to be prominent -
  not a subtle footnote), an unknown-characters list (shown only if non-empty, with a
  short explanation that those characters were dropped/ignored during encoding), and
  two download buttons (PNG via a generated `Blob`/object URL, SVG via a `Blob` of the
  SVG string) that trigger a browser download with a sensible filename
  (e.g. `hexarot-cryptogram.png` / `.svg`).

## Error handling

- **Client-side key-format check** (key mode only): a regex matching the `HR{digit}·{4
  chars}` shape, checked on submit before calling the API - if it fails, the form shows
  an inline error immediately, no network round-trip. This is a cheap UX improvement,
  not a security or correctness boundary - the backend remains the sole source of truth
  for whether a key is actually valid (its `KeyCodec.decode()` still runs and can still
  reject a client-side-well-formed-but-semantically-invalid key).
- **Backend 400 responses** (invalid params, malformed key, unknown reading order
  string, etc.) and **network-level failures** (backend unreachable, request timeout)
  are both caught in `api/client.ts`, normalized into a single `ApiError` shape, and
  surfaced through the store's `errorMessage` - `EncodeView.vue` always displays this
  to the user rather than swallowing it, satisfying the backlog's explicit
  "API error is shown to the user" acceptance criterion.
- **Loading state**: `status === 'loading'` disables the form's submit button and
  shows a loading indicator, satisfying the "Loading state is shown during API call"
  criterion.

## Testing strategy

- `@vue/test-utils` added as a devDependency (not currently present).
- `src/api/client.spec.ts` - the fetch wrapper in isolation: successful JSON response,
  400 error response (mapped to `ApiError` with the backend's message), and a network
  failure (mapped to a distinct, still-user-facing `ApiError`). `fetch` itself is
  mocked (`vi.stubGlobal('fetch', ...)` or equivalent) - no real network call in any
  test.
- `src/stores/encode.spec.ts` - the Pinia store in isolation: payload construction
  differs correctly between `'params'` and `'key'` mode, `status`/`result`/`errorMessage`
  transitions correctly through a successful call and a failed call, `reset()` restores
  defaults. `api/client.ts` is mocked here (the store's own logic is what's under test,
  not the network layer already covered above).
- `src/components/RotationSequencePicker.spec.ts` - renders the four angles; reordering
  itself is tested by directly mutating the array bound to `vuedraggable`'s
  `v-model`/`modelValue` (not by simulating real mouse drag events, which is flaky and
  low-value in jsdom for a library that already has its own test suite for the actual
  drag mechanics) and asserting the component emits the correct `number[]` index order
  in response.
- `src/views/EncodeView.spec.ts` - a light integration test: mounts the view with a real
  Pinia store but a mocked `api/client.ts`, fills the form, submits, and asserts the
  result panel (or error message) renders correctly - mirroring the backend's
  `MockAlphabet`-substitution pattern of never hitting a real network/backend in tests.
- Every new/changed test follows the project's existing house rule (already enforced
  backend-side, applies equally here): no `for`/`while`/`if` directly inside a test
  body; use Vitest's `it.each` for parameterized cases (e.g. testing each of the three
  `status` transitions, or each of the 8 `readingOrder` select options rendering
  correctly).

## i18n

Every user-visible string (labels, button text, placeholders, error/warning messages,
the unknown-characters explanation) is routed through a `vue-i18n` key rather than
hardcoded, added to `src/locales/en.json` under a namespaced structure
(`encode.form.*`, `encode.result.*`, `nav.*` for the shared layout, etc.) so that
FEAT-020 (French interface) can later add `fr.json` mirroring the same key structure
without touching any component.

## Explicitly out of scope for this feature

- Visual design/styling polish - REFACTOR-001 ("UI/UX design pass - encode, decode and
  key views") is a separate, later backlog item for exactly this. FEAT-014 uses
  functional, minimal styling (plain scoped `<style>` blocks per component, no CSS
  framework added) - readable and usable, not visually refined.
- French interface - FEAT-020, not started. This feature only ensures the i18n key
  structure doesn't need reshaping when French is added.
- Authentication / route guards - FEAT-021, not started. The router has no guard logic.
- Any change to `DecodeView.vue`/`KeyView.vue` beyond what's needed for the shared
  `AppLayout.vue`/router wiring to route to their (still-stub) content - those are
  FEAT-015/FEAT-016's own scope.
