# FEAT-014 Encode View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend's first working view (`/encode`): a form for composing a HexaRot cryptogram (by parameters or by pasting an existing key), submitted to the existing `POST /api/encode` backend, with the resulting PNG/SVG/key/warnings displayed and downloadable — plus the shared routing/HTTP/state infrastructure the two sibling views (FEAT-015/016) will reuse without repeating.

**Architecture:** Vue 3 + `<script setup>` + Pinia (one store per view, `useEncodeStore` here) + `vue-router` (three top-level routes) + a thin `fetch()` wrapper (`src/api/client.ts`) as the only place that talks to the backend. Component tree: `EncodeView` (routed page) renders `EncodeParamsForm` (all inputs, drives the store) and, once a request resolves, `EncodeResultPanel` (previews/downloads). `RotationSequencePicker` (drag-and-drop via `vuedraggable`) is a standalone controlled input nested inside the form.

**Tech Stack:** Vue 3.5, TypeScript strict, Pinia 3, `vue-router` 4.6, `vuedraggable` 4.1 (the Vue-3-compatible line — see Global Constraints), `vue-i18n` 9, Vitest 3 + `@vue/test-utils` 2.4 + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-17-feat-014-encode-view-design.md`

**Test contract:** `docs/tests/frontend.md` section 1 ("Encode view") and section 2 ("Encode store") — Task 8's integration spec must cover every bullet listed there; fixtures required by that doc go in `src/__fixtures__/frontend.fixtures.ts` (this plan adds only the encode-related ones; FEAT-015/016 add the rest to the same file later).

## Global Constraints

- **`vue-router` pinned to `^4.6.4`, not the current npm `latest` (`5.2.0`).** v5 requires `vue ^3.5.34` (this project has `^3.5.30`) and an undeclared peer, `@pinia/colada` — pulling it in now would introduce an unplanned dependency and a version floor bump outside this feature's scope. v4.6.4 is the actively maintained line for Vue 3.5.30 and matches the spec's "classic routes" description exactly.
- **`vuedraggable` pinned to `^4.1.0`, not npm's `latest` tag (`2.24.3`, Vue 2 only).** The Vue-3-compatible release is published under the `next` dist-tag as `4.1.0` (peer dep `vue: ^3.0.1`, wraps SortableJS). Install with an explicit version, never a bare `vuedraggable@latest`.
- Every user-visible string (labels, placeholders, button text, errors, warnings) goes through a `vue-i18n` key in `src/locales/en.json` — no hardcoded literal text in any template. Keys are namespaced (`nav.*`, `encode.form.*`, `encode.result.*`).
- No CSS framework. Plain scoped `<style>` blocks, functional and minimal — visual polish is REFACTOR-001's job, not this feature's.
- Test bodies never contain a bare `for`/`while`/`if`. Use Vitest's `it.each` for parameterized cases.
- `src/api/client.ts` is the only module allowed to call `fetch` directly. Stores and components call `postJson`/`getJson`; their own tests mock `'../api/client'`, not `fetch`.
- Backend response/request shapes are copied verbatim from `backend/src/api/encode.service.ts` (`EncodeResult`) and `backend/src/api/dto/encode-request.dto.ts` (request fields/constraints) — do not invent field names.

---

### Task 1: Shared frontend infrastructure — router, layout, build config

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/layouts/AppLayout.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/locales/en.json`
- Delete: `frontend/src/components/HelloWorld.vue`
- Delete: `frontend/src/assets/hero.png`
- Delete: `frontend/src/assets/vue.svg`
- Delete: `frontend/src/assets/vite.svg`
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the `router` export from `src/router/index.ts` (a `vue-router` `Router` instance, routes `/encode`, `/decode`, `/key`, `/` redirects to `/encode`); the app now boots through `AppLayout.vue`; Vitest is configured for `jsdom` in `vite.config.ts` so every later task's `*.spec.ts` file runs without extra setup; the dev proxy `/api` → `http://localhost:3000` exists so `src/api/client.ts` (Task 2) can call relative `/api/...` paths in dev.

- [ ] **Step 1: Install new dependencies**

Run from `frontend/`:

```bash
npm install vue-router@^4.6.4 vuedraggable@^4.1.0
npm install -D @vue/test-utils@^2.4.11 jsdom@^30.0.1
```

Verify `frontend/package.json`'s `dependencies` now includes `vue-router` and `vuedraggable`, and `devDependencies` includes `@vue/test-utils` and `jsdom`, all at the versions above (not higher — see Global Constraints on why `vue-router`/`vuedraggable` are pinned).

- [ ] **Step 2: Configure Vitest and the dev proxy in `vite.config.ts`**

Replace the full contents of `frontend/vite.config.ts` with:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
})
```

(`defineConfig` now comes from `vitest/config` instead of `vite` — this is the standard way to get a single config file that both Vite and Vitest understand, and it re-exports everything `vite`'s `defineConfig` provides.)

- [ ] **Step 3: Create the router**

Create `frontend/src/router/index.ts`:

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import EncodeView from '../views/EncodeView.vue'
import DecodeView from '../views/DecodeView.vue'
import KeyView from '../views/KeyView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/encode' },
    { path: '/encode', name: 'encode', component: EncodeView },
    { path: '/decode', name: 'decode', component: DecodeView },
    { path: '/key', name: 'key', component: KeyView },
  ],
})
```

- [ ] **Step 4: Add navigation i18n keys**

Replace the full contents of `frontend/src/locales/en.json` (currently `{}`) with:

```json
{
  "nav": {
    "encode": "Encode",
    "decode": "Decode",
    "key": "Key"
  }
}
```

- [ ] **Step 5: Create `AppLayout.vue`**

Create `frontend/src/layouts/AppLayout.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="app-layout">
    <nav class="app-layout__nav">
      <router-link to="/encode">{{ t('nav.encode') }}</router-link>
      <router-link to="/decode">{{ t('nav.decode') }}</router-link>
      <router-link to="/key">{{ t('nav.key') }}</router-link>
    </nav>
    <main class="app-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout__nav {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.app-layout__nav a {
  color: var(--text-h);
  text-decoration: none;
  font-weight: 500;
}

.app-layout__nav a.router-link-active {
  color: var(--accent);
}

.app-layout__content {
  padding: 16px;
}
</style>
```

- [ ] **Step 6: Rewrite `App.vue` to render the layout**

Replace the full contents of `frontend/src/App.vue`:

```vue
<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue'
</script>

<template>
  <AppLayout />
</template>
```

- [ ] **Step 7: Delete the scaffold component and its now-unused assets**

```bash
git rm frontend/src/components/HelloWorld.vue frontend/src/assets/hero.png frontend/src/assets/vue.svg frontend/src/assets/vite.svg
```

- [ ] **Step 8: Strip HelloWorld-specific CSS from `style.css`**

Replace the full contents of `frontend/src/style.css` with (keeps the design tokens and base reset, drops every rule that only existed for the deleted scaffold component — `.hero`, `.counter`, `#next-steps`, `#docs`, `#spacer`, `.ticks`, `#center`):

```css
:root {
  --text: #6b6375;
  --text-h: #08060d;
  --bg: #fff;
  --border: #e5e4e7;
  --code-bg: #f4f3ec;
  --accent: #aa3bff;
  --accent-bg: rgba(170, 59, 255, 0.1);
  --accent-border: rgba(170, 59, 255, 0.5);
  --shadow:
    rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.05) 0 4px 6px -2px;

  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  --heading: system-ui, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, Consolas, monospace;

  font: 18px/145% var(--sans);
  letter-spacing: 0.18px;
  color-scheme: light dark;
  color: var(--text);
  background: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (max-width: 1024px) {
    font-size: 16px;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #9ca3af;
    --text-h: #f3f4f6;
    --bg: #16171d;
    --border: #2e303a;
    --code-bg: #1f2028;
    --accent: #c084fc;
    --accent-bg: rgba(192, 132, 252, 0.15);
    --accent-border: rgba(192, 132, 252, 0.5);
    --shadow:
      rgba(0, 0, 0, 0.4) 0 10px 15px -3px, rgba(0, 0, 0, 0.25) 0 4px 6px -2px;
  }
}

body {
  margin: 0;
}

h1,
h2 {
  font-family: var(--heading);
  font-weight: 500;
  color: var(--text-h);
}

code {
  font-family: var(--mono);
  display: inline-flex;
  border-radius: 4px;
  color: var(--text-h);
  font-size: 15px;
  line-height: 135%;
  padding: 4px 8px;
  background: var(--code-bg);
}

#app {
  max-width: 1126px;
  margin: 0 auto;
  min-height: 100svh;
  box-sizing: border-box;
}
```

- [ ] **Step 9: Register the router in `main.ts`**

Replace the full contents of `frontend/src/main.ts`:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { router } from './router'
import en from './locales/en.json'

const pinia = createPinia()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})

const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.use(router)
app.mount('#app')
```

- [ ] **Step 10: Add the frontend's API base URL to `docker-compose.yml`**

In `docker-compose.yml`, under the `frontend` service's `environment:` block, add `VITE_API_BASE_URL` alongside the existing `NODE_ENV`:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      VITE_API_BASE_URL: http://backend:3000/api
    depends_on:
      - backend
```

(Only the `environment:` block changes — everything else in the `frontend:` service stays as-is.)

- [ ] **Step 11: Verify the build and typecheck are clean**

Run from `frontend/`:

```bash
npm run build
```

Expected: exits 0 (`vue-tsc -b && vite build` succeeds — no unresolved imports, no TS errors from the deleted scaffold's leftover references).

```bash
npm test
```

Expected: exits 0 (`vitest run --passWithNoTests` — no spec files exist yet, this just confirms the jsdom environment config from Step 2 doesn't itself break anything).

- [ ] **Step 12: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/router/index.ts frontend/src/layouts/AppLayout.vue frontend/src/App.vue frontend/src/main.ts frontend/src/style.css frontend/src/locales/en.json docker-compose.yml
git commit -m "feat(frontend): add router, layout, and shared build config for FEAT-014"
```

(The `git rm` from Step 7 stages its own deletions — `git status` should show no remaining unstaged changes after this commit.)

---

### Task 2: HTTP client wrapper

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/client.spec.ts`

**Interfaces:**
- Consumes: nothing new (a leaf module — only the dev proxy from Task 1 affects it, and only at runtime, not in tests).
- Produces: `postJson<TResponse>(path: string, body: unknown): Promise<TResponse>`, `getJson<TResponse>(path: string, query?: Record<string, string>): Promise<TResponse>`, and the `ApiError` class (`message: string`, `status?: number`), all exported from `src/api/client.ts`. Every later task that talks to the backend imports from here.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/api/client.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { postJson, getJson, ApiError } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('postJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    const result = await postJson<{ ok: boolean }>('/encode', { message: 'hi' })

    expect(result).toEqual({ ok: true })
  })

  it('sends the body as JSON with a JSON content-type header', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await postJson('/encode', { message: 'hi' })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/encode'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: 'hi' }),
      }),
    )
  })

  it.each([
    ['a single string message', { statusCode: 400, message: 'message must not be empty', error: 'Bad Request' }, 'message must not be empty'],
    ['an array of validation messages', { statusCode: 400, message: ['message must not be empty', 'size must be one of the following values: small, medium, large'], error: 'Bad Request' }, 'message must not be empty, size must be one of the following values: small, medium, large'],
  ])('maps a 400 response with %s to an ApiError with the joined message', async (_label, errorBody, expectedMessage) => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody, 400))

    await expect(postJson('/encode', {})).rejects.toMatchObject({
      message: expectedMessage,
      status: 400,
    })
  })

  it('maps a network failure to an ApiError', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(postJson('/encode', {})).rejects.toBeInstanceOf(ApiError)
  })
})

describe('getJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends query parameters to the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/key/parse', { key: 'HR1·a1b2' })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/key/parse?key=HR1%C2%B7a1b2'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ pivotBlockSize: 5 }))

    const result = await getJson<{ pivotBlockSize: number }>('/key/parse', { key: 'HR1·a1b2' })

    expect(result).toEqual({ pivotBlockSize: 5 })
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/api/client.spec.ts`
Expected: FAIL — `client.ts` does not exist yet (`Cannot find module './client'`).

- [ ] **Step 3: Implement the client**

Create `frontend/src/api/client.ts`:

```typescript
const DEFAULT_BASE_URL = '/api'

interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  return configured && configured.length > 0 ? configured : DEFAULT_BASE_URL
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  if (response.ok) {
    return (await response.json()) as TResponse
  }

  const body = await parseErrorBody(response)
  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : (body.message ?? response.statusText);

  throw new ApiError(message, response.status)
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new ApiError('Network error: unable to reach the server')
  }
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<TResponse>(response)
}

export async function getJson<TResponse>(
  path: string,
  query?: Record<string, string>,
): Promise<TResponse> {
  const search = query ? `?${new URLSearchParams(query).toString()}` : ''
  const response = await doFetch(`${resolveBaseUrl()}${path}${search}`, {
    method: 'GET',
  })
  return handleResponse<TResponse>(response)
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/api/client.spec.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/client.spec.ts
git commit -m "feat(frontend): add fetch-based API client wrapper"
```

---

### Task 3: Reading-order constants, fixtures, and the encode Pinia store

**Files:**
- Create: `frontend/src/constants/reading-orders.ts`
- Create: `frontend/src/__fixtures__/frontend.fixtures.ts`
- Create: `frontend/src/stores/encode.ts`
- Create: `frontend/src/stores/encode.spec.ts`

**Interfaces:**
- Consumes: `postJson` from `src/api/client.ts` (Task 2) — `postJson<EncodeResult>('/encode', payload)`; `ApiError` from the same module.
- Produces: `READING_ORDERS: readonly string[]` and `type ReadingOrder` from `src/constants/reading-orders.ts` (Task 6's form consumes this for its `<select>` options); `EncodeResult`, `EncodeMode`, `EncodeStatus` types and the `useEncodeStore` Pinia store from `src/stores/encode.ts` — state fields `mode`, `message`, `pivotBlockSize`, `rotationSequence`, `rotationDirection`, `readingOrder`, `size`, `keyInput`, `overrideWeaknessWarning`, `status`, `result`, `errorMessage`; actions `submit(): Promise<void>` and `reset(): void` (Tasks 6-8 all consume this store directly via `useEncodeStore()`); `MOCK_ENCODE_RESPONSE` and `MOCK_ENCODE_RESPONSE_WITH_WARNINGS` from `src/__fixtures__/frontend.fixtures.ts` (Task 8's integration test consumes these).

- [ ] **Step 1: Create the reading-order constants**

Create `frontend/src/constants/reading-orders.ts`:

```typescript
/**
 * Mirrors backend/src/key/key-codec.ts's READING_ORDERS — the frontend and
 * backend are separate deployables, so this list is duplicated rather than
 * imported across the project boundary. Keep both lists in sync by hand.
 */
export const READING_ORDERS = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
] as const

export type ReadingOrder = (typeof READING_ORDERS)[number]
```

- [ ] **Step 2: Create the shared fixtures file**

Create `frontend/src/__fixtures__/frontend.fixtures.ts`:

```typescript
import type { EncodeResult } from '../stores/encode'

// A minimal valid 1x1 transparent PNG, base64-encoded — realistic enough to
// exercise data-URL rendering and blob-download code paths without needing
// a real render.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

export const MOCK_ENCODE_RESPONSE: EncodeResult = {
  png: TINY_PNG_BASE64,
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>',
  key: 'HR1·a1b2',
  warnings: [],
  unknownChars: [],
}

export const MOCK_ENCODE_RESPONSE_WITH_WARNINGS: EncodeResult = {
  ...MOCK_ENCODE_RESPONSE,
  warnings: ['pivotBlockSize is below the recommended minimum for this alphabet'],
  unknownChars: ['@', '#'],
}

export const MALFORMED_KEY = 'not-a-valid-key'
```

- [ ] **Step 3: Write the failing store tests**

Create `frontend/src/stores/encode.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEncodeStore } from './encode'
import { ApiError } from '../api/client'
import { MOCK_ENCODE_RESPONSE } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

describe('useEncodeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('initialises with default field values and no result or error', () => {
    const store = useEncodeStore()

    expect(store.mode).toBe('params')
    expect(store.message).toBe('')
    expect(store.pivotBlockSize).toBe(5)
    expect(store.rotationSequence).toEqual([0, 1, 2, 3])
    expect(store.rotationDirection).toBe('cw')
    expect(store.readingOrder).toBe('LR-TB')
    expect(store.size).toBe('medium')
    expect(store.overrideWeaknessWarning).toBe(false)
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
    expect(store.errorMessage).toBeNull()
  })

  it.each([
    ['params', { message: 'hi', pivotBlockSize: 5, rotationSequence: [0, 1, 2, 3], rotationDirection: 'cw', readingOrder: 'LR-TB', size: 'medium', overrideWeaknessWarning: false }],
    ['key', { message: 'hi', key: 'HR1·a1b2', size: 'medium', overrideWeaknessWarning: false }],
  ])('builds the %s-mode payload correctly when submitting', async (mode, expectedPayload) => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    store.mode = mode as 'params' | 'key'
    store.message = 'hi'
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/encode', expectedPayload)
  })

  it('sets status to loading while the request is in flight', () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const store = useEncodeStore()

    void store.submit()

    expect(store.status).toBe('loading')
  })

  it('stores the result and sets status to success on a successful submit', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()

    await store.submit()

    expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)
    expect(store.status).toBe('success')
    expect(store.errorMessage).toBeNull()
  })

  it('stores the error message and sets status to error on a failed submit', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 400))
    const store = useEncodeStore()

    await store.submit()

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('message must not be empty')
    expect(store.result).toBeNull()
  })

  it('clears the previous result when a new submit is dispatched', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    await store.submit()
    expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)

    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    void store.submit()

    expect(store.result).toBeNull()
  })

  it('restores default state when reset is called', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    store.message = 'changed'
    await store.submit()

    store.reset()

    expect(store.message).toBe('')
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
  })
})
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `npm test -- src/stores/encode.spec.ts`
Expected: FAIL — `./encode` does not exist yet.

- [ ] **Step 5: Implement the store**

Create `frontend/src/stores/encode.ts`:

```typescript
import { defineStore } from 'pinia'
import { postJson, ApiError } from '../api/client'
import type { ReadingOrder } from '../constants/reading-orders'

export type EncodeMode = 'params' | 'key'
export type RotationDirection = 'cw' | 'ccw'
export type CryptogramSize = 'small' | 'medium' | 'large'
export type EncodeStatus = 'idle' | 'loading' | 'success' | 'error'

/** Mirrors backend/src/api/encode.service.ts's EncodeResult. */
export interface EncodeResult {
  png: string
  svg: string
  key: string
  warnings: string[]
  unknownChars: string[]
}

interface EncodeState {
  mode: EncodeMode
  message: string
  pivotBlockSize: number
  rotationSequence: number[]
  rotationDirection: RotationDirection
  readingOrder: ReadingOrder
  size: CryptogramSize
  keyInput: string
  overrideWeaknessWarning: boolean
  status: EncodeStatus
  result: EncodeResult | null
  errorMessage: string | null
}

function initialState(): EncodeState {
  return {
    mode: 'params',
    message: '',
    pivotBlockSize: 5,
    rotationSequence: [0, 1, 2, 3],
    rotationDirection: 'cw',
    readingOrder: 'LR-TB',
    size: 'medium',
    keyInput: '',
    overrideWeaknessWarning: false,
    status: 'idle',
    result: null,
    errorMessage: null,
  }
}

export const useEncodeStore = defineStore('encode', {
  state: initialState,
  actions: {
    async submit(): Promise<void> {
      this.status = 'loading'
      this.result = null
      this.errorMessage = null

      const payload =
        this.mode === 'key'
          ? {
              message: this.message,
              key: this.keyInput,
              size: this.size,
              overrideWeaknessWarning: this.overrideWeaknessWarning,
            }
          : {
              message: this.message,
              pivotBlockSize: this.pivotBlockSize,
              rotationSequence: this.rotationSequence,
              rotationDirection: this.rotationDirection,
              readingOrder: this.readingOrder,
              size: this.size,
              overrideWeaknessWarning: this.overrideWeaknessWarning,
            }

      try {
        this.result = await postJson<EncodeResult>('/encode', payload)
        this.status = 'success'
      } catch (err) {
        this.errorMessage = err instanceof ApiError ? err.message : 'Unknown error'
        this.status = 'error'
      }
    },
    reset(): void {
      Object.assign(this, initialState())
    },
  },
})
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test -- src/stores/encode.spec.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/constants/reading-orders.ts frontend/src/__fixtures__/frontend.fixtures.ts frontend/src/stores/encode.ts frontend/src/stores/encode.spec.ts
git commit -m "feat(frontend): add encode Pinia store, reading-order constants, and shared test fixtures"
```

---

### Task 4: Key-format client-side validation utility

**Files:**
- Create: `frontend/src/utils/key-format.ts`
- Create: `frontend/src/utils/key-format.spec.ts`

**Interfaces:**
- Consumes: nothing (pure function, no dependencies).
- Produces: `isValidKeyFormat(key: string): boolean` from `src/utils/key-format.ts`. Task 6's `EncodeParamsForm.vue` consumes this for the key-mode client-side check described in the spec's "Error handling" section.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/utils/key-format.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isValidKeyFormat } from './key-format'
import { MALFORMED_KEY } from '../__fixtures__/frontend.fixtures'

describe('isValidKeyFormat', () => {
  it.each([
    ['HR1·a1b2'],
    ['HR1·0000'],
    ['HR9·zzzz'],
  ])('accepts a well-formed key: %s', (key) => {
    expect(isValidKeyFormat(key)).toBe(true)
  })

  it.each([
    ['the fixture MALFORMED_KEY', MALFORMED_KEY],
    ['missing the separator', 'HR1a1b2'],
    ['wrong prefix', 'XX1·a1b2'],
    ['payload too short', 'HR1·a1b'],
    ['payload too long', 'HR1·a1b23'],
    ['empty string', ''],
    ['uppercase payload characters', 'HR1·A1B2'],
  ])('rejects %s', (_label, key) => {
    expect(isValidKeyFormat(key)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- src/utils/key-format.spec.ts`
Expected: FAIL — `./key-format` does not exist yet.

- [ ] **Step 3: Implement the utility**

Create `frontend/src/utils/key-format.ts`:

```typescript
/**
 * Cheap client-side shape check for a HexaRot key (`HR{version}·{4-char
 * base36 payload}`) - not a correctness check. The backend's
 * KeyCodec.decode() remains the sole source of truth for whether a
 * well-formed-looking key actually decodes to valid parameters.
 */
const KEY_FORMAT_REGEX = /^HR\d·[0-9a-z]{4}$/

export function isValidKeyFormat(key: string): boolean {
  return KEY_FORMAT_REGEX.test(key.trim())
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/utils/key-format.spec.ts`
Expected: PASS, all 10 cases green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/key-format.ts frontend/src/utils/key-format.spec.ts
git commit -m "feat(frontend): add client-side HexaRot key format validation"
```

---

### Task 5: Rotation sequence drag-and-drop picker

**Files:**
- Create: `frontend/src/components/RotationSequencePicker.vue`
- Create: `frontend/src/components/RotationSequencePicker.spec.ts`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `vuedraggable` (Task 1's dependency install).
- Produces: `RotationSequencePicker.vue`, a `v-model`-compatible component: prop `modelValue: number[]` (a permutation of `[0,1,2,3]`), event `update:modelValue` with the reordered `number[]`. Task 6's `EncodeParamsForm.vue` consumes this as `<RotationSequencePicker v-model="store.rotationSequence" />`.

- [ ] **Step 1: Add the component's i18n key**

In `frontend/src/locales/en.json`, add a `encode` top-level key alongside the existing `nav` key:

```json
{
  "nav": {
    "encode": "Encode",
    "decode": "Decode",
    "key": "Key"
  },
  "encode": {
    "form": {
      "rotationSequence": {
        "label": "Rotation sequence"
      }
    }
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/components/RotationSequencePicker.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import RotationSequencePicker from './RotationSequencePicker.vue'
import en from '../locales/en.json'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountPicker(modelValue: number[]) {
  return mount(RotationSequencePicker, {
    props: { modelValue },
    global: { plugins: [i18n] },
  })
}

describe('RotationSequencePicker', () => {
  it('renders the four rotation angles in the order given by modelValue', () => {
    const wrapper = mountPicker([0, 1, 2, 3])

    const items = wrapper.findAll('li')
    expect(items.map((item) => item.text())).toEqual(['0°', '90°', '180°', '270°'])
  })

  it('renders angles reordered when modelValue is a different permutation', () => {
    const wrapper = mountPicker([3, 1, 0, 2])

    const items = wrapper.findAll('li')
    expect(items.map((item) => item.text())).toEqual(['270°', '90°', '0°', '180°'])
  })

  it('emits the reordered index permutation when the draggable list is reordered', async () => {
    const wrapper = mountPicker([0, 1, 2, 3])

    await wrapper.findComponent(draggable).vm.$emit('update:modelValue', [
      { index: 2, angle: 180 },
      { index: 0, angle: 0 },
      { index: 1, angle: 90 },
      { index: 3, angle: 270 },
    ])

    expect(wrapper.emitted('update:modelValue')).toEqual([[[2, 0, 1, 3]]])
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- src/components/RotationSequencePicker.spec.ts`
Expected: FAIL — `RotationSequencePicker.vue` does not exist yet.

- [ ] **Step 4: Implement the component**

Create `frontend/src/components/RotationSequencePicker.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import { useI18n } from 'vue-i18n'

const ANGLES = [0, 90, 180, 270] as const

interface RotationItem {
  index: number
  angle: number
}

const props = defineProps<{
  modelValue: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const { t } = useI18n()

const items = computed<RotationItem[]>({
  get: () => props.modelValue.map((index) => ({ index, angle: ANGLES[index] })),
  set: (value) => emit('update:modelValue', value.map((item) => item.index)),
})
</script>

<template>
  <draggable
    v-model="items"
    item-key="index"
    tag="ul"
    class="rotation-sequence-picker"
    :aria-label="t('encode.form.rotationSequence.label')"
  >
    <template #item="{ element }: { element: RotationItem }">
      <li class="rotation-sequence-picker__item">{{ element.angle }}°</li>
    </template>
  </draggable>
</template>

<style scoped>
.rotation-sequence-picker {
  display: flex;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.rotation-sequence-picker__item {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  background: var(--code-bg);
}
</style>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- src/components/RotationSequencePicker.spec.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/RotationSequencePicker.vue frontend/src/components/RotationSequencePicker.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add drag-and-drop rotation sequence picker"
```

---

### Task 6: Encode parameters form

**Files:**
- Create: `frontend/src/components/EncodeParamsForm.vue`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `useEncodeStore` (Task 3), `RotationSequencePicker.vue` (Task 5), `isValidKeyFormat` (Task 4), `READING_ORDERS` (Task 3).
- Produces: `EncodeParamsForm.vue`, a component with no props (reads/writes `useEncodeStore()` directly). Task 8's `EncodeView.vue` renders it as `<EncodeParamsForm />`. This component has no dedicated spec file — its behavior (payload building, loading state, mode switching) is verified end-to-end by Task 8's `EncodeView.spec.ts`, per the spec's testing strategy and `docs/tests/frontend.md`'s `EncodeView`-level test list.

- [ ] **Step 1: Add the form's i18n keys**

In `frontend/src/locales/en.json`, extend the existing `encode.form` object (added in Task 5) to its full shape:

```json
{
  "nav": {
    "encode": "Encode",
    "decode": "Decode",
    "key": "Key"
  },
  "encode": {
    "form": {
      "mode": {
        "label": "Mode",
        "params": "New parameters",
        "key": "Existing key"
      },
      "message": {
        "label": "Message",
        "placeholder": "Enter the message to encode"
      },
      "pivotBlockSize": {
        "label": "Pivot block size"
      },
      "rotationSequence": {
        "label": "Rotation sequence"
      },
      "rotationDirection": {
        "label": "Rotation direction",
        "cw": "Clockwise",
        "ccw": "Counter-clockwise"
      },
      "readingOrder": {
        "label": "Reading order"
      },
      "size": {
        "label": "Cryptogram size",
        "small": "Small",
        "medium": "Medium",
        "large": "Large"
      },
      "overrideWeaknessWarning": {
        "label": "Suppress weakness warnings"
      },
      "key": {
        "label": "HexaRot key",
        "placeholder": "HR1·xxxx",
        "formatError": "This does not look like a valid HexaRot key."
      },
      "submit": {
        "label": "Encode",
        "loading": "Encoding..."
      }
    }
  }
}
```

- [ ] **Step 2: Implement the component**

Create `frontend/src/components/EncodeParamsForm.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import { READING_ORDERS } from '../constants/reading-orders'
import { isValidKeyFormat } from '../utils/key-format'
import RotationSequencePicker from './RotationSequencePicker.vue'

const store = useEncodeStore()
const { t } = useI18n()

const keyFormatError = computed(() => {
  if (store.mode !== 'key' || store.keyInput.length === 0) return null
  return isValidKeyFormat(store.keyInput) ? t('encode.form.key.formatError') : null
})

const canSubmit = computed(() => {
  if (store.status === 'loading') return false
  if (store.message.trim().length === 0) return false
  if (store.mode === 'key') {
    return store.keyInput.length > 0 && keyFormatError.value === null
  }
  return true
})

function handleSubmit(): void {
  if (!canSubmit.value) return
  void store.submit()
}
</script>

<template>
  <form class="encode-params-form" @submit.prevent="handleSubmit">
    <fieldset class="encode-params-form__mode-toggle">
      <legend>{{ t('encode.form.mode.label') }}</legend>
      <label>
        <input v-model="store.mode" type="radio" value="params">
        {{ t('encode.form.mode.params') }}
      </label>
      <label>
        <input v-model="store.mode" type="radio" value="key">
        {{ t('encode.form.mode.key') }}
      </label>
    </fieldset>

    <label class="encode-params-form__field">
      {{ t('encode.form.message.label') }}
      <textarea v-model="store.message" :placeholder="t('encode.form.message.placeholder')" />
    </label>

    <template v-if="store.mode === 'params'">
      <label class="encode-params-form__field">
        {{ t('encode.form.pivotBlockSize.label') }}
        <input v-model.number="store.pivotBlockSize" type="number" min="1" max="255">
      </label>

      <div class="encode-params-form__field">
        {{ t('encode.form.rotationSequence.label') }}
        <RotationSequencePicker v-model="store.rotationSequence" />
      </div>

      <label class="encode-params-form__field">
        {{ t('encode.form.rotationDirection.label') }}
        <select v-model="store.rotationDirection">
          <option value="cw">{{ t('encode.form.rotationDirection.cw') }}</option>
          <option value="ccw">{{ t('encode.form.rotationDirection.ccw') }}</option>
        </select>
      </label>

      <label class="encode-params-form__field">
        {{ t('encode.form.readingOrder.label') }}
        <select v-model="store.readingOrder">
          <option v-for="order in READING_ORDERS" :key="order" :value="order">{{ order }}</option>
        </select>
      </label>
    </template>

    <template v-else>
      <label class="encode-params-form__field">
        {{ t('encode.form.key.label') }}
        <input v-model="store.keyInput" type="text" :placeholder="t('encode.form.key.placeholder')">
      </label>
      <p v-if="keyFormatError" class="encode-params-form__error" role="alert">{{ keyFormatError }}</p>
    </template>

    <label class="encode-params-form__field">
      {{ t('encode.form.size.label') }}
      <select v-model="store.size">
        <option value="small">{{ t('encode.form.size.small') }}</option>
        <option value="medium">{{ t('encode.form.size.medium') }}</option>
        <option value="large">{{ t('encode.form.size.large') }}</option>
      </select>
    </label>

    <label class="encode-params-form__checkbox">
      <input v-model="store.overrideWeaknessWarning" type="checkbox">
      {{ t('encode.form.overrideWeaknessWarning.label') }}
    </label>

    <button type="submit" :disabled="!canSubmit">
      {{ store.status === 'loading' ? t('encode.form.submit.loading') : t('encode.form.submit.label') }}
    </button>
  </form>
</template>

<style scoped>
.encode-params-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.encode-params-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.encode-params-form__mode-toggle {
  display: flex;
  gap: 16px;
  border: none;
  padding: 0;
}

.encode-params-form__error {
  color: #c0392b;
}
</style>
```

- [ ] **Step 3: Verify the build is clean**

Run from `frontend/`: `npm run build`
Expected: exits 0. (No dedicated spec for this task — behavioral verification happens in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/EncodeParamsForm.vue frontend/src/locales/en.json
git commit -m "feat(frontend): add encode parameters form"
```

---

### Task 7: Encode result panel

**Files:**
- Create: `frontend/src/components/EncodeResultPanel.vue`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `EncodeResult` type (Task 3).
- Produces: `EncodeResultPanel.vue`, prop `result: EncodeResult` (required). Task 8's `EncodeView.vue` renders it as `<EncodeResultPanel v-if="store.status === 'success' && store.result" :result="store.result" />`. No dedicated spec file — verified via Task 8's integration test, same reasoning as Task 6.

- [ ] **Step 1: Add the result panel's i18n keys**

In `frontend/src/locales/en.json`, add a sibling `result` object under `encode` (alongside the existing `form` object):

```json
"result": {
  "pngAlt": "PNG cryptogram preview",
  "keyLabel": "Key",
  "copy": "Copy",
  "copied": "Copied!",
  "warningsHeading": "Weakness warnings",
  "unknownCharsExplanation": "The following characters are not part of the alphabet and were dropped during encoding:",
  "downloadPng": "Download PNG",
  "downloadSvg": "Download SVG"
}
```

(Insert this as a new key inside the existing `"encode": { ... }` object, next to `"form"`.)

- [ ] **Step 2: Implement the component**

Create `frontend/src/components/EncodeResultPanel.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EncodeResult } from '../stores/encode'

const props = defineProps<{
  result: EncodeResult
}>()

const { t } = useI18n()

const pngDataUrl = computed(() => `data:image/png;base64,${props.result.png}`)

const copyState = ref<'idle' | 'copied'>('idle')

async function copyKey(): Promise<void> {
  await navigator.clipboard.writeText(props.result.key)
  copyState.value = 'copied'
  setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function downloadPng(): void {
  const byteChars = atob(props.result.png)
  const byteNumbers = new Array<number>(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  triggerDownload(new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' }), 'hexarot-cryptogram.png')
}

function downloadSvg(): void {
  triggerDownload(new Blob([props.result.svg], { type: 'image/svg+xml' }), 'hexarot-cryptogram.svg')
}
</script>

<template>
  <section class="encode-result-panel">
    <div class="encode-result-panel__previews">
      <img :src="pngDataUrl" :alt="t('encode.result.pngAlt')" class="encode-result-panel__png">
      <!-- eslint-disable-next-line vue/no-v-html -- result.svg is generated exclusively by this project's own backend renderer, never from user input, so it is a trusted string. -->
      <div class="encode-result-panel__svg" v-html="result.svg" />
    </div>

    <div class="encode-result-panel__key">
      <span>{{ t('encode.result.keyLabel') }}: <code>{{ result.key }}</code></span>
      <button type="button" @click="copyKey">
        {{ copyState === 'copied' ? t('encode.result.copied') : t('encode.result.copy') }}
      </button>
    </div>

    <div v-if="result.warnings.length > 0" class="encode-result-panel__warnings" role="alert">
      <p>{{ t('encode.result.warningsHeading') }}</p>
      <ul>
        <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
      </ul>
    </div>

    <div v-if="result.unknownChars.length > 0" class="encode-result-panel__unknown-chars">
      <p>{{ t('encode.result.unknownCharsExplanation') }}</p>
      <ul>
        <li v-for="char in result.unknownChars" :key="char">{{ char }}</li>
      </ul>
    </div>

    <div class="encode-result-panel__downloads">
      <button type="button" @click="downloadPng">{{ t('encode.result.downloadPng') }}</button>
      <button type="button" @click="downloadSvg">{{ t('encode.result.downloadSvg') }}</button>
    </div>
  </section>
</template>

<style scoped>
.encode-result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.encode-result-panel__previews {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.encode-result-panel__png {
  image-rendering: pixelated;
  max-width: 200px;
}

.encode-result-panel__key {
  display: flex;
  align-items: center;
  gap: 8px;
}

.encode-result-panel__warnings {
  border: 1px solid #c0392b;
  border-radius: 4px;
  padding: 8px 12px;
}
</style>
```

- [ ] **Step 3: Verify the build is clean**

Run from `frontend/`: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/EncodeResultPanel.vue frontend/src/locales/en.json
git commit -m "feat(frontend): add encode result panel with previews, copy, and downloads"
```

---

### Task 8: Encode view assembly, integration tests, and roadmap update

**Files:**
- Create: `frontend/src/views/EncodeView.vue` (overwrites the 3-line stub)
- Create: `frontend/src/views/EncodeView.spec.ts`
- Modify: `frontend/src/locales/en.json`
- Modify: `README.md`
- Modify: `README.fr.md`

**Interfaces:**
- Consumes: `useEncodeStore` (Task 3), `EncodeParamsForm.vue` (Task 6), `EncodeResultPanel.vue` (Task 7), `MOCK_ENCODE_RESPONSE`/`MOCK_ENCODE_RESPONSE_WITH_WARNINGS` (Task 3), `postJson` (Task 2, mocked in tests).
- Produces: the routed `/encode` page, wired into the router from Task 1. Nothing downstream in this plan consumes this task's output — it is the plan's final deliverable.

- [ ] **Step 1: Add the view's remaining i18n key**

In `frontend/src/locales/en.json`, add `"title": "Encode a message"` as a sibling of `"form"` and `"result"` inside the `"encode"` object:

```json
"encode": {
  "title": "Encode a message",
  "form": { ... },
  "result": { ... }
}
```

(Keep the existing `form` and `result` objects from Tasks 6/7 unchanged — only add the new `title` key at the same nesting level.)

- [ ] **Step 2: Write the failing integration tests**

Create `frontend/src/views/EncodeView.spec.ts`. This covers every bullet in `docs/tests/frontend.md` section 1 (`EncodeView`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import EncodeView from './EncodeView.vue'
import en from '../locales/en.json'
import {
  MOCK_ENCODE_RESPONSE,
  MOCK_ENCODE_RESPONSE_WITH_WARNINGS,
} from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(EncodeView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('EncodeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  describe('initial state', () => {
    it('renders the message input field', () => {
      const wrapper = mountView()
      expect(wrapper.find('textarea').exists()).toBe(true)
    })

    it.each([
      ['pivotBlockSize', 'input[type="number"]'],
      ['rotationDirection', 'select'],
      ['size', 'select'],
    ])('renders the %s control', (_field, selector) => {
      const wrapper = mountView()
      expect(wrapper.find(selector).exists()).toBe(true)
    })

    it('renders the rotation sequence picker', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('li').length).toBe(4)
    })

    it('renders the submit button', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('does not display a cryptogram preview on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('does not display warnings or unknown chars on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('.encode-result-panel__warnings').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__unknown-chars').exists()).toBe(false)
    })
  })

  describe('form submission', () => {
    it('calls the encode API with the correct payload when the form is submitted', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith(
        '/encode',
        expect.objectContaining({ message: 'hello world', size: 'medium' }),
      )
    })

    it('shows a loading indicator while the API call is in progress', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('button[type="submit"]').text()).toBe('Encoding...')
    })

    it('hides the loading indicator after the API call resolves', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('button[type="submit"]').text()).toBe('Encode')
    })
  })

  describe('successful response', () => {
    async function submitAndResolve(response = MOCK_ENCODE_RESPONSE) {
      vi.mocked(postJson).mockResolvedValue(response)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      return wrapper
    }

    it('displays the PNG preview after a successful encode response', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.find('img').attributes('src')).toContain(MOCK_ENCODE_RESPONSE.png)
    })

    it('displays the SVG preview after a successful encode response', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.find('.encode-result-panel__svg svg').exists()).toBe(true)
    })

    it('displays the HR key returned by the API', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain(MOCK_ENCODE_RESPONSE.key)
    })

    it('makes the HR key copyable (copy button present)', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Copy')
    })

    it('shows a PNG download link/button', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Download PNG')
    })

    it('shows an SVG download link/button', async () => {
      const wrapper = await submitAndResolve()
      expect(wrapper.text()).toContain('Download SVG')
    })
  })

  describe('warnings and unknown chars', () => {
    it('displays weakness warnings when the API response includes them', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE_WITH_WARNINGS)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__warnings').text()).toContain(
        MOCK_ENCODE_RESPONSE_WITH_WARNINGS.warnings[0],
      )
    })

    it('displays the list of unknown characters when the API response includes them', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE_WITH_WARNINGS)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.encode-result-panel__unknown-chars').text()).toContain('@')
    })

    it('does not display warning or unknown char sections when arrays are empty', async () => {
      const wrapper = await (async () => {
        vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
        const w = mountView()
        await w.find('textarea').setValue('hello world')
        await w.find('form').trigger('submit')
        await flushPromises()
        return w
      })()

      expect(wrapper.find('.encode-result-panel__warnings').exists()).toBe(false)
      expect(wrapper.find('.encode-result-panel__unknown-chars').exists()).toBe(false)
    })
  })

  describe('error handling', () => {
    it('displays an error message when the API call returns a 4xx or 5xx response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 400))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('message must not be empty')
    })

    it('does not display a cryptogram preview after an API error', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 400))
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('clears the previous result when a new submission is made', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const wrapper = mountView()
      await wrapper.find('textarea').setValue('hello world')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.find('img').exists()).toBe(true)

      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('img').exists()).toBe(false)
    })
  })

  describe('i18n', () => {
    it('renders no raw string literals - the submit button text comes from the locale file', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').text()).toBe(en.encode.form.submit.label)
    })
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- src/views/EncodeView.spec.ts`
Expected: FAIL — `EncodeView.vue` is still the 3-line stub (`<div>EncodeView</div>`), none of the selectors exist.

- [ ] **Step 4: Implement the view**

Replace the full contents of `frontend/src/views/EncodeView.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEncodeStore } from '../stores/encode'
import EncodeParamsForm from '../components/EncodeParamsForm.vue'
import EncodeResultPanel from '../components/EncodeResultPanel.vue'

const store = useEncodeStore()
const { t } = useI18n()
</script>

<template>
  <div class="encode-view">
    <h1>{{ t('encode.title') }}</h1>
    <EncodeParamsForm />
    <p v-if="store.status === 'error'" class="encode-view__error" role="alert">
      {{ store.errorMessage }}
    </p>
    <EncodeResultPanel v-if="store.status === 'success' && store.result" :result="store.result" />
  </div>
</template>

<style scoped>
.encode-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.encode-view__error {
  color: #c0392b;
}
</style>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- src/views/EncodeView.spec.ts`
Expected: PASS, all tests green.

Then run the full frontend suite: `npm test`
Expected: PASS — every spec file from Tasks 2-8 green together (no cross-test pollution from shared mocks).

- [ ] **Step 6: Update the README roadmap**

In `README.md`, replace the line:

```markdown
- ⬜ Frontend (encode view, decode view, key view)
```

with:

```markdown
- 🔄 Frontend (encode view done; decode view, key view still open)
```

In `README.fr.md`, replace the line:

```markdown
- ⬜ Frontend (vue encodage, vue décodage, vue clé)
```

with:

```markdown
- 🔄 Frontend (vue encodage terminée ; vue décodage, vue clé restantes)
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/EncodeView.vue frontend/src/views/EncodeView.spec.ts frontend/src/locales/en.json README.md README.fr.md
git commit -m "feat(frontend): assemble the encode view and wire it into the router"
```

- [ ] **Step 8: Real functional check (not just the automated suite)**

Per the project's standing rule that every feature producing a user-facing result gets a real, manual check in addition to its automated tests (a fully green Vitest suite proves the mocked contract, not that the app actually renders and works):

1. Start the backend for real (reuse the pattern from FEAT-012's verification: a throwaway Postgres container, `prisma migrate deploy`, then `npm run start:dev` in `backend/`, confirming it boots — the `moduleFormat = "cjs"` fix from `fix/prisma-cjs-module-format` must be present on this branch's base for this to succeed).
2. Start the frontend dev server for real: `npm run dev` in `frontend/`.
3. Open `http://localhost:5173` in a browser (or via the `claude-in-chrome` tools) — confirm the nav bar renders with three links, `/` redirects to `/encode`, and the encode form renders.
4. Fill in a real message, submit with default parameters, and confirm a real PNG/SVG preview and HR key render from a real backend response (not a mock).
5. Try the "Existing key" mode with a key copied from a prior successful encode, and confirm it also succeeds.
6. Try an intentionally weak `pivotBlockSize` (e.g. `1`) and confirm the warnings section renders.
7. Stop the frontend dev server and the throwaway backend/database when done.

This step has no code artifact — it is a verification gate before considering FEAT-014 done, not a task with a commit.

---

## Post-plan notes (not tasks — for the controller running this plan)

- The approved spec (`docs/superpowers/specs/2026-08-17-feat-014-encode-view-design.md`) currently sits as an untracked file in the main checkout. Per the established pattern (mirrors FEAT-012), copy it into the FEAT-014 worktree and commit it there as the worktree's first commit, before dispatching Task 1 — then delete the stray copy from the main checkout. Fold this plan file into that same first commit.
- Also fold the still-pending `.claude/` → `.gitignore` hygiene fix into that same first commit (see `project-2026-08-17-session-handoff` memory).
- `DecodeView.vue`/`KeyView.vue` are untouched by this plan beyond being routed to as still-stub components — that is FEAT-015/016's scope, not a gap here.
