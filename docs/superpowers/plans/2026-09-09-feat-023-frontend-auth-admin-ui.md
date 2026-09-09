# FEAT-023 Frontend Auth & Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Vue frontend a full authentication flow (register, verify email, login, resend verification) and an admin user-management UI, so the app FEAT-021 gated behind JWT auth is usable again, and enforce password complexity server-side.

**Architecture:** A dependency-free `frontend/src/auth/token-storage.ts` module holds the access token in a `localStorage`-backed Vue `ref`, imported by both `api/client.ts` (to attach `Authorization` headers and clear the session on 401) and `stores/auth.ts` (to expose it as a reactive `accessToken` getter) without a circular import between the two. `stores/auth.ts` and a new `stores/admin.ts` follow the existing `stores/encode.ts` action/status pattern. Router guards gate `/encode`, `/decode`, `/key`, `/admin/users`; a single watcher in `AppLayout.vue` handles both the guard-rejection and mid-session-expiry redirect cases. Backend gets one small addition: a password complexity regex on `RegisterDto`.

**Tech Stack:** NestJS 11 + class-validator (backend), Vue 3 + Pinia + vue-router 4 + vue-i18n 9 + Vitest + @vue/test-utils (frontend). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-09-feat-023-frontend-auth-admin-ui-design.md`

## Global Constraints

- Token storage: `localStorage`, single key `hexarot_access_token`, owned by `frontend/src/auth/token-storage.ts` (spec Decision 2). This module is an implementation-level addition not named in the spec's file list, but it implements exactly what Decisions 2 and 5 describe (localStorage-backed token, read by the client and the store) - it did not exist as a name at spec time.
- Route guard redirects eagerly to `/login?redirect=<path>` for unauthenticated access to a protected route; protected routes are `/encode`, `/decode`, `/key`, `/admin/users` (spec Decision 3).
- The user profile is always fetched via `GET /auth/me`; the JWT payload is never decoded client-side (spec Decision 4). `main.ts` awaits `authStore.restoreSession()` before installing the router and mounting the app - this is a simpler mechanism than the spec's `authStore.ready` promise sketch, but produces the same guarantee the spec requires: the first navigation's guard always sees a settled auth state, because the router does not exist yet while the restore is in flight.
- `api/client.ts` attaches `Authorization: Bearer <token>` when a token is present, and clears the session on a `401` response - but only when a token was actually sent with that request (a `401` from `POST /auth/login` with no token attached is a credentials failure, not a session expiry, and must not clear an unrelated active session). It never navigates. Navigation on token loss is owned by one `watch(() => authStore.accessToken, ...)` in `AppLayout.vue` (spec Decision 5).
- Password complexity (lowercase, uppercase, digit, special character, in addition to the existing 12-72 length bounds) is enforced server-side in `RegisterDto` and mirrored client-side in `utils/password-strength.ts` for live, per-criterion feedback only (spec Decision 6).
- No account enumeration: login and resend-verification error messages never reveal whether an email is registered.
- No new npm dependencies in either package.
- All user-facing strings go through vue-i18n keys (English only, per existing project convention).
- Coverage thresholds (85% branches/functions/lines/statements) apply to everything under `frontend/src/**` except `main.ts`, `App.vue`, `router/**`, `layouts/**`, `__fixtures__/**` (`frontend/vite.config.ts`) - every new store, util, and component needs a spec; `router/index.ts`'s guard logic is exempt from coverage but still gets a spec because it is genuinely load-bearing logic worth a regression test.

---

### Task 1: Add the FEAT-023 backlog entry

**Files:**
- Modify: `BACKLOG.md`

- [ ] **Step 1: Insert the new item**

Insert the following block immediately after the `<!-- ITEM:END -->` that closes the `FEAT-022` item and before the `<!-- ITEM:BEGIN -->` that opens `CHORE-010`:

```markdown
<!-- ITEM:BEGIN -->
- **type:** feat
- **id:** FEAT-023
- **milestone:** v2
- **status:** in-progress
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
```

- [ ] **Step 2: Commit**

```bash
git checkout -b feat/FEAT-023-frontend-auth-admin-ui
git add BACKLOG.md
git commit -m "docs: add FEAT-023 backlog entry

Modified files:
- BACKLOG.md — add FEAT-023 (frontend auth + admin UI + backend password complexity)"
```

---

### Task 2: Backend - enforce password complexity in `RegisterDto`

**Files:**
- Modify: `backend/src/auth/dto/register.dto.ts`
- Modify: `backend/src/auth/dto/register.dto.spec.ts`
- Modify: `backend/test/fixtures/auth.fixtures.ts`

**Interfaces:**
- Produces: `RegisterDto` still has `email: string` and `password: string`; validation now additionally rejects a password missing a lowercase letter, uppercase letter, digit, or special character (message: `"password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"`).

- [ ] **Step 1: Write the failing tests**

Replace the contents of `backend/src/auth/dto/register.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('RegisterDto', () => {
  it('passes with a valid email and a password meeting every complexity rule', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery9',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateBody({
      email: 'not-an-email',
      password: 'Correct-Horse-Battery9',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('fails when password is shorter than 12 characters', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Sh0rt-a!',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no uppercase letter', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'correct-horse-battery9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no lowercase letter', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'CORRECT-HORSE-BATTERY9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no digit', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no special character', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'CorrectHorseBattery9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when extra fields are present (strict DTO)', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery9',
      role: 'ADMIN',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/auth/dto/register.dto.spec.ts`
Expected: FAIL - the "no uppercase"/"no lowercase"/"no digit"/"no special character" cases pass validation today (no complexity rule exists yet), so those `expect(...).toBe(true)` assertions fail.

- [ ] **Step 3: Implement the complexity rule**

Replace the contents of `backend/src/auth/dto/register.dto.ts`:

```ts
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;

/** Request body for POST /auth/register. */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
  })
  password!: string;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/auth/dto/register.dto.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Update the shared e2e/service test fixture password**

`backend/test/fixtures/auth.fixtures.ts`'s `VALID_PASSWORD` is consumed by `backend/test/auth.e2e-spec.ts`, which now goes through the DTO's `class-validator` pipe on every `POST /auth/register` call. Update it to a complexity-compliant value:

```ts
export function uniqueTestEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export const VALID_PASSWORD = 'Correct-Horse-Battery9';
```

`backend/src/auth/auth.service.spec.ts` calls `AuthService.register()` directly, bypassing the DTO's `class-validator` pipe entirely, so its hardcoded `'correct-horse-battery-staple'` fixtures do not need to change.

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && npm run test`
Expected: PASS - in particular `auth.service.spec.ts` (unaffected) and any e2e suite covering `auth.e2e-spec.ts` if run in this environment.

- [ ] **Step 7: Commit**

```bash
git add backend/src/auth/dto/register.dto.ts backend/src/auth/dto/register.dto.spec.ts backend/test/fixtures/auth.fixtures.ts
git commit -m "feat(auth): enforce password complexity on registration

Modified files:
- backend/src/auth/dto/register.dto.ts — add @Matches complexity regex (lowercase, uppercase, digit, special character)
- backend/src/auth/dto/register.dto.spec.ts — add one failing case per missing criterion, update the valid-password fixture
- backend/test/fixtures/auth.fixtures.ts — update VALID_PASSWORD to satisfy the new complexity rule"
```

---

### Task 3: Frontend - `auth/token-storage.ts`

**Files:**
- Create: `frontend/src/auth/token-storage.ts`
- Test: `frontend/src/auth/token-storage.spec.ts`

**Interfaces:**
- Produces: `accessToken: Ref<string | null>`, `setAccessToken(token: string): void`, `clearAccessToken(): void`. Consumed by Task 4 (`api/client.ts`) and Task 6 (`stores/auth.ts`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/auth/token-storage.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { accessToken, setAccessToken, clearAccessToken } from './token-storage'

describe('token-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  it('starts with no token when localStorage is empty', () => {
    expect(accessToken.value).toBeNull()
  })

  it('stores the token in both the ref and localStorage', () => {
    setAccessToken('token-123')

    expect(accessToken.value).toBe('token-123')
    expect(localStorage.getItem('hexarot_access_token')).toBe('token-123')
  })

  it('clears the token from both the ref and localStorage', () => {
    setAccessToken('token-123')

    clearAccessToken()

    expect(accessToken.value).toBeNull()
    expect(localStorage.getItem('hexarot_access_token')).toBeNull()
  })

  it('restores a previously stored token when the module loads', async () => {
    localStorage.setItem('hexarot_access_token', 'preexisting-token')
    vi.resetModules()

    const mod = await import('./token-storage')

    expect(mod.accessToken.value).toBe('preexisting-token')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/auth/token-storage.spec.ts`
Expected: FAIL with "Cannot find module './token-storage'"

- [ ] **Step 3: Implement**

Create `frontend/src/auth/token-storage.ts`:

```ts
import { ref } from 'vue'

const STORAGE_KEY = 'hexarot_access_token'

/** Reactive access token, backed by localStorage. Read by api/client.ts to
 * attach Authorization headers and by stores/auth.ts to expose accessToken
 * without either module importing the other. */
export const accessToken = ref<string | null>(localStorage.getItem(STORAGE_KEY))

export function setAccessToken(token: string): void {
  accessToken.value = token
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearAccessToken(): void {
  accessToken.value = null
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/auth/token-storage.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/token-storage.ts frontend/src/auth/token-storage.spec.ts
git commit -m "feat(frontend): add localStorage-backed access token module

Modified files:
- frontend/src/auth/token-storage.ts — new, reactive accessToken ref + setAccessToken/clearAccessToken
- frontend/src/auth/token-storage.spec.ts — new, storage and restore-on-load coverage"
```

---

### Task 4: Frontend - `api/client.ts` attaches the token and clears the session on 401

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.spec.ts`

**Interfaces:**
- Consumes: `accessToken` (`Ref<string | null>`), `clearAccessToken(): void` from Task 3's `../auth/token-storage`.
- Produces: existing `postJson<TResponse>(path, body): Promise<TResponse>` and `ApiError` unchanged. New: `getJson<TResponse>(path): Promise<TResponse>`, `patchJson<TResponse>(path, body): Promise<TResponse>`, `deleteJson(path): Promise<void>`. Consumed by Task 6 (`stores/auth.ts` uses `getJson`) and Task 16 (`stores/admin.ts` uses `getJson`/`patchJson`/`deleteJson`).

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/api/client.spec.ts` (keep the existing `postJson` describe block, add these after it, and add the new import at the top):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getJson, postJson, patchJson, deleteJson, ApiError } from './client'
import { accessToken, setAccessToken, clearAccessToken } from '../auth/token-storage'
```

Then append these new `describe` blocks at the end of the file:

```ts
describe('getJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a GET request and returns the parsed JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'user-1' }))

    const result = await getJson<{ id: string }>('/auth/me')

    expect(result).toEqual({ id: 'user-1' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.objectContaining({ method: 'GET' }))
  })
})

describe('patchJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a PATCH request with a JSON body and returns the parsed response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'user-1', active: false }))

    const result = await patchJson('/admin/users/user-1', { active: false })

    expect(result).toEqual({ id: 'user-1', active: false })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/user-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ active: false }),
      }),
    )
  })
})

describe('deleteJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a DELETE request and resolves with no value on a 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    const result = await deleteJson('/admin/users/user-1')

    expect(result).toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/admin/users/user-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('token attachment and session clearing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('attaches an Authorization header when a token is present', async () => {
    setAccessToken('jwt-token')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/auth/me')

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }) }),
    )
  })

  it('sends no Authorization header when there is no token', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/auth/me')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('clears the stored token on a 401 response when a token was sent', async () => {
    setAccessToken('jwt-token')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ statusCode: 401, message: 'Invalid or expired token' }, 401))

    await expect(getJson('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(accessToken.value).toBeNull()
  })

  it('does not clear anything on a 401 response when no token was sent', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ statusCode: 401, message: 'Invalid credentials' }, 401))

    await expect(postJson('/auth/login', { email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(ApiError)

    expect(accessToken.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/api/client.spec.ts`
Expected: FAIL with "getJson is not exported" / "patchJson is not exported" / "deleteJson is not exported"

- [ ] **Step 3: Implement**

Replace the contents of `frontend/src/api/client.ts`:

```ts
import { accessToken, clearAccessToken } from '../auth/token-storage'

const DEFAULT_BASE_URL = '/api'

interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export class ApiError extends Error {
  readonly status?: number
  readonly code: 'http' | 'network'

  constructor(message: string, code: 'http' | 'network', status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
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
    if (response.status === 204) {
      return undefined as TResponse
    }
    return (await response.json()) as TResponse
  }

  const body = await parseErrorBody(response)
  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : (body.message ?? response.statusText);

  throw new ApiError(message, 'http', response.status)
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  // A 401 only means "the session died" when this request actually carried a
  // token - a 401 from an anonymous POST /auth/login (wrong password) must
  // not clear an unrelated, still-valid session sitting in another tab.
  const hadToken = accessToken.value !== null
  if (hadToken) {
    headers.Authorization = `Bearer ${accessToken.value}`
  }

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch {
    throw new ApiError('Network error: unable to reach the server', 'network')
  }

  if (hadToken && response.status === 401) {
    clearAccessToken()
  }

  return response
}

export async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, { method: 'GET' })
  return handleResponse<TResponse>(response)
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<TResponse>(response)
}

export async function patchJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<TResponse>(response)
}

export async function deleteJson(path: string): Promise<void> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, { method: 'DELETE' })
  return handleResponse<void>(response)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/api/client.spec.ts`
Expected: PASS (all existing `postJson` tests plus the new ones)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/client.spec.ts
git commit -m "feat(frontend): attach auth token to API requests and clear session on 401

Modified files:
- frontend/src/api/client.ts — add getJson/patchJson/deleteJson, attach Authorization header, clear token on an authenticated request's 401
- frontend/src/api/client.spec.ts — cover the three new functions and the token attach/clear behavior"
```

---

### Task 5: Frontend - `utils/password-strength.ts`

**Files:**
- Create: `frontend/src/utils/password-strength.ts`
- Test: `frontend/src/utils/password-strength.spec.ts`

**Interfaces:**
- Produces: `PasswordCriteria { minLength: boolean; lowercase: boolean; uppercase: boolean; digit: boolean; special: boolean }`, `evaluatePassword(password: string): PasswordCriteria`, `isPasswordValid(password: string): boolean`. Consumed by Task 11 (`RegisterForm.vue`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/password-strength.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluatePassword, isPasswordValid } from './password-strength'

describe('evaluatePassword', () => {
  it('reports all criteria met for a fully valid password', () => {
    expect(evaluatePassword('Correct-Horse-Battery9')).toEqual({
      minLength: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      special: true,
    })
  })

  it('reports minLength unmet for a password shorter than 12 characters', () => {
    expect(evaluatePassword('Short-1a').minLength).toBe(false)
  })

  it('reports uppercase unmet when the password has no uppercase letter', () => {
    expect(evaluatePassword('correct-horse-battery9').uppercase).toBe(false)
  })

  it('reports lowercase unmet when the password has no lowercase letter', () => {
    expect(evaluatePassword('CORRECT-HORSE-BATTERY9').lowercase).toBe(false)
  })

  it('reports digit unmet when the password has no digit', () => {
    expect(evaluatePassword('Correct-Horse-Battery').digit).toBe(false)
  })

  it('reports special unmet when the password has no special character', () => {
    expect(evaluatePassword('CorrectHorseBattery9').special).toBe(false)
  })
})

describe('isPasswordValid', () => {
  it('returns true when every criterion is met', () => {
    expect(isPasswordValid('Correct-Horse-Battery9')).toBe(true)
  })

  it('returns false when any criterion is unmet', () => {
    expect(isPasswordValid('correct-horse-battery9')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/password-strength.spec.ts`
Expected: FAIL with "Cannot find module './password-strength'"

- [ ] **Step 3: Implement**

Create `frontend/src/utils/password-strength.ts`:

```ts
/** Mirrors backend/src/auth/dto/register.dto.ts's complexity rule - live,
 * per-criterion feedback only. The backend remains the sole source of truth;
 * a passing client-side check does not guarantee the server accepts it. */
const MIN_LENGTH = 12

export interface PasswordCriteria {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  digit: boolean
  special: boolean
}

export function evaluatePassword(password: string): PasswordCriteria {
  return {
    minLength: password.length >= MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordValid(password: string): boolean {
  const criteria = evaluatePassword(password)
  return Object.values(criteria).every(Boolean)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/password-strength.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/password-strength.ts frontend/src/utils/password-strength.spec.ts
git commit -m "feat(frontend): add client-side password complexity check

Modified files:
- frontend/src/utils/password-strength.ts — new, mirrors the backend's complexity rule for live feedback
- frontend/src/utils/password-strength.spec.ts — one case per criterion plus a fully valid password"
```

---

### Task 6: Frontend - `stores/auth.ts`

**Files:**
- Create: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/__fixtures__/frontend.fixtures.ts`
- Test: `frontend/src/stores/auth.spec.ts`

**Interfaces:**
- Consumes: `getJson`, `postJson`, `ApiError` from `../api/client` (Task 4); `accessToken`, `setAccessToken`, `clearAccessToken` from `../auth/token-storage` (Task 3).
- Produces: `useAuthStore()` with state `user: PublicUser | null`, `loginStatus`/`registerStatus`/`verifyStatus`/`resendStatus: 'idle' | 'loading' | 'success' | 'error'`, `loginErrorKind: 'invalidCredentials' | 'unverified' | 'disabled' | 'network' | 'unknown' | null`, `registerErrorKind: 'duplicateEmail' | 'validation' | 'network' | 'unknown' | null`, `registerErrorMessage: string | null`, `verifyErrorMessage: string | null`, `resendErrorKind: 'network' | 'unknown' | null`; getter `accessToken: string | null`; actions `login(email, password): Promise<void>`, `register(email, password): Promise<void>`, `verifyEmail(token): Promise<void>`, `resendVerification(email): Promise<void>`, `logout(): void`, `restoreSession(): Promise<void>`, `fetchMe(): Promise<void>`. `PublicUser` type exported for Tasks 15/17/18.

- [ ] **Step 1: Add fixtures the test needs**

Append to `frontend/src/__fixtures__/frontend.fixtures.ts` (add the import alongside the existing one at the top):

```ts
import type { PublicUser } from '../stores/auth'
```

And append at the end of the file:

```ts
export const MOCK_PUBLIC_USER: PublicUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'USER',
  emailVerified: true,
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
}

export const MOCK_ADMIN_USER: PublicUser = {
  ...MOCK_PUBLIC_USER,
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'ADMIN',
}
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/stores/auth.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import { ApiError } from '../api/client'
import { clearAccessToken, setAccessToken } from '../auth/token-storage'
import { MOCK_PUBLIC_USER, MOCK_ADMIN_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAccessToken()
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  describe('login', () => {
    it('stores the access token and fetches the current user on success', async () => {
      vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
      vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(postJson).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'Password-123!' })
      expect(getJson).toHaveBeenCalledWith('/auth/me')
      expect(store.accessToken).toBe('jwt-token')
      expect(store.user).toEqual(MOCK_PUBLIC_USER)
      expect(store.loginStatus).toBe('success')
    })

    it('sets loginErrorKind to unverified on a 401 "Email address not verified" response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Email address not verified', 'http', 401))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginStatus).toBe('error')
      expect(store.loginErrorKind).toBe('unverified')
      expect(store.accessToken).toBeNull()
    })

    it('sets loginErrorKind to disabled on a 403 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('This account has been disabled', 'http', 403))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginErrorKind).toBe('disabled')
    })

    it('sets loginErrorKind to invalidCredentials on any other 401 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid credentials', 'http', 401))
      const store = useAuthStore()

      await store.login('user@example.com', 'wrong-password')

      expect(store.loginErrorKind).toBe('invalidCredentials')
    })

    it('sets loginErrorKind to network on a network failure', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
      const store = useAuthStore()

      await store.login('user@example.com', 'Password-123!')

      expect(store.loginErrorKind).toBe('network')
    })
  })

  describe('register', () => {
    it('sets registerStatus to success on a successful registration', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()

      await store.register('new@example.com', 'Password-123!')

      expect(postJson).toHaveBeenCalledWith('/auth/register', { email: 'new@example.com', password: 'Password-123!' })
      expect(store.registerStatus).toBe('success')
    })

    it('sets registerErrorKind to duplicateEmail on a 409 response', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('An account with this email already exists', 'http', 409))
      const store = useAuthStore()

      await store.register('taken@example.com', 'Password-123!')

      expect(store.registerErrorKind).toBe('duplicateEmail')
    })

    it('sets registerErrorKind to validation and keeps the backend message on a 400 response', async () => {
      const message =
        'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
      vi.mocked(postJson).mockRejectedValue(new ApiError(message, 'http', 400))
      const store = useAuthStore()

      await store.register('new@example.com', 'allweaklowercase')

      expect(store.registerErrorKind).toBe('validation')
      expect(store.registerErrorMessage).toBe(message)
    })
  })

  describe('verifyEmail', () => {
    it('sets verifyStatus to success on a valid token', async () => {
      vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
      const store = useAuthStore()

      await store.verifyEmail('valid-token')

      expect(postJson).toHaveBeenCalledWith('/auth/verify-email', { token: 'valid-token' })
      expect(store.verifyStatus).toBe('success')
    })

    it('sets verifyStatus to error with the backend message on an invalid token', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid or expired verification token', 'http', 400))
      const store = useAuthStore()

      await store.verifyEmail('bad-token')

      expect(store.verifyStatus).toBe('error')
      expect(store.verifyErrorMessage).toBe('Invalid or expired verification token')
    })
  })

  describe('resendVerification', () => {
    it('sets resendStatus to success', async () => {
      vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
      const store = useAuthStore()

      await store.resendVerification('user@example.com')

      expect(postJson).toHaveBeenCalledWith('/auth/resend-verification', { email: 'user@example.com' })
      expect(store.resendStatus).toBe('success')
    })

    it('sets resendStatus to error with resendErrorKind network on a network failure', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
      const store = useAuthStore()

      await store.resendVerification('user@example.com')

      expect(store.resendStatus).toBe('error')
      expect(store.resendErrorKind).toBe('network')
    })
  })

  describe('logout', () => {
    it('clears the access token and user', async () => {
      vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
      vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
      const store = useAuthStore()
      await store.login('user@example.com', 'Password-123!')

      store.logout()

      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('restoreSession', () => {
    it('does nothing when there is no stored token', async () => {
      const store = useAuthStore()

      await store.restoreSession()

      expect(getJson).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
    })

    it('fetches and stores the current user when a token is present', async () => {
      setAccessToken('existing-token')
      vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USER)
      const store = useAuthStore()

      await store.restoreSession()

      expect(getJson).toHaveBeenCalledWith('/auth/me')
      expect(store.user).toEqual(MOCK_ADMIN_USER)
    })

    it('clears the token when it is no longer accepted by the server', async () => {
      setAccessToken('expired-token')
      vi.mocked(getJson).mockRejectedValue(new ApiError('Invalid or expired token', 'http', 401))
      const store = useAuthStore()

      await store.restoreSession()

      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/auth.spec.ts`
Expected: FAIL with "Cannot find module './auth'"

- [ ] **Step 4: Implement**

Create `frontend/src/stores/auth.ts`:

```ts
import { defineStore } from 'pinia'
import { getJson, postJson, ApiError } from '../api/client'
import { accessToken as storedAccessToken, setAccessToken, clearAccessToken } from '../auth/token-storage'

export type UserRole = 'USER' | 'ADMIN'

/** Mirrors backend/src/auth/auth.service.ts's PublicUser - never includes passwordHash. */
export interface PublicUser {
  id: string
  email: string
  role: UserRole
  emailVerified: boolean
  active: boolean
  createdAt: string
}

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
export type LoginErrorKind = 'invalidCredentials' | 'unverified' | 'disabled' | 'network' | 'unknown'
export type RegisterErrorKind = 'duplicateEmail' | 'validation' | 'network' | 'unknown'

interface AuthState {
  user: PublicUser | null
  loginStatus: AsyncStatus
  loginErrorKind: LoginErrorKind | null
  registerStatus: AsyncStatus
  registerErrorKind: RegisterErrorKind | null
  registerErrorMessage: string | null
  verifyStatus: AsyncStatus
  verifyErrorMessage: string | null
  resendStatus: AsyncStatus
  resendErrorKind: 'network' | 'unknown' | null
}

function initialState(): AuthState {
  return {
    user: null,
    loginStatus: 'idle',
    loginErrorKind: null,
    registerStatus: 'idle',
    registerErrorKind: null,
    registerErrorMessage: null,
    verifyStatus: 'idle',
    verifyErrorMessage: null,
    resendStatus: 'idle',
    resendErrorKind: null,
  }
}

export const useAuthStore = defineStore('auth', {
  state: initialState,
  getters: {
    accessToken: (): string | null => storedAccessToken.value,
  },
  actions: {
    async fetchMe(): Promise<void> {
      this.user = await getJson<PublicUser>('/auth/me')
    },

    async login(email: string, password: string): Promise<void> {
      this.loginStatus = 'loading'
      this.loginErrorKind = null
      try {
        const { accessToken } = await postJson<{ accessToken: string }>('/auth/login', { email, password })
        setAccessToken(accessToken)
        await this.fetchMe()
        this.loginStatus = 'success'
      } catch (err) {
        this.loginStatus = 'error'
        if (err instanceof ApiError && err.code === 'http') {
          if (err.status === 401 && err.message === 'Email address not verified') {
            this.loginErrorKind = 'unverified'
          } else if (err.status === 403) {
            this.loginErrorKind = 'disabled'
          } else if (err.status === 401) {
            this.loginErrorKind = 'invalidCredentials'
          } else {
            this.loginErrorKind = 'unknown'
          }
        } else if (err instanceof ApiError && err.code === 'network') {
          this.loginErrorKind = 'network'
        } else {
          this.loginErrorKind = 'unknown'
        }
      }
    },

    async register(email: string, password: string): Promise<void> {
      this.registerStatus = 'loading'
      this.registerErrorKind = null
      this.registerErrorMessage = null
      try {
        await postJson('/auth/register', { email, password })
        this.registerStatus = 'success'
      } catch (err) {
        this.registerStatus = 'error'
        if (err instanceof ApiError && err.code === 'http') {
          if (err.status === 409) {
            this.registerErrorKind = 'duplicateEmail'
          } else if (err.status === 400) {
            this.registerErrorKind = 'validation'
            this.registerErrorMessage = err.message
          } else {
            this.registerErrorKind = 'unknown'
          }
        } else if (err instanceof ApiError && err.code === 'network') {
          this.registerErrorKind = 'network'
        } else {
          this.registerErrorKind = 'unknown'
        }
      }
    },

    async verifyEmail(token: string): Promise<void> {
      this.verifyStatus = 'loading'
      this.verifyErrorMessage = null
      try {
        await postJson('/auth/verify-email', { token })
        this.verifyStatus = 'success'
      } catch (err) {
        this.verifyStatus = 'error'
        this.verifyErrorMessage = err instanceof ApiError ? err.message : null
      }
    },

    async resendVerification(email: string): Promise<void> {
      this.resendStatus = 'loading'
      this.resendErrorKind = null
      try {
        await postJson('/auth/resend-verification', { email })
        this.resendStatus = 'success'
      } catch (err) {
        this.resendStatus = 'error'
        this.resendErrorKind = err instanceof ApiError && err.code === 'network' ? 'network' : 'unknown'
      }
    },

    logout(): void {
      clearAccessToken()
      this.user = null
    },

    async restoreSession(): Promise<void> {
      if (!storedAccessToken.value) return
      try {
        await this.fetchMe()
      } catch {
        clearAccessToken()
        this.user = null
      }
    },
  },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/auth.spec.ts`
Expected: PASS (14 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/auth.ts frontend/src/stores/auth.spec.ts frontend/src/__fixtures__/frontend.fixtures.ts
git commit -m "feat(frontend): add auth store

Modified files:
- frontend/src/stores/auth.ts — new, login/register/verifyEmail/resendVerification/logout/restoreSession/fetchMe
- frontend/src/stores/auth.spec.ts — new, covers every action and error branch
- frontend/src/__fixtures__/frontend.fixtures.ts — add MOCK_PUBLIC_USER/MOCK_ADMIN_USER"
```

---

### Task 7: Frontend - `main.ts` awaits session restore before mount

**Files:**
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Consumes: `useAuthStore` from `../stores/auth` (Task 6).

`frontend/src/main.ts` is excluded from coverage thresholds (`frontend/vite.config.ts`) and has no existing spec - this task has no test step.

- [ ] **Step 1: Implement**

Replace the contents of `frontend/src/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import en from './locales/en.json'
import './style.css'

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

// Router guards read authStore.accessToken/user - restoring the session
// before the router is installed guarantees the very first navigation sees
// a settled auth state instead of racing the restore.
const authStore = useAuthStore()
await authStore.restoreSession()

app.use(router)
app.mount('#app')
```

- [ ] **Step 2: Verify the app still boots**

Run: `cd frontend && npm run build`
Expected: build succeeds (top-level `await` is supported by Vite's default ESM output target).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.ts
git commit -m "feat(frontend): restore the auth session before mounting the app

Modified files:
- frontend/src/main.ts — await authStore.restoreSession() before installing the router and mounting"
```

---

### Task 8: Frontend - `components/ConfirmDialog.vue`

**Files:**
- Create: `frontend/src/components/ConfirmDialog.vue`
- Test: `frontend/src/components/ConfirmDialog.spec.ts`

**Interfaces:**
- Produces: props `{ open: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string }`, emits `confirm`, `cancel`. Consumed by Task 17 (`AdminUsersView.vue`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ConfirmDialog.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

function mountDialog(open: boolean) {
  return mount(ConfirmDialog, {
    props: {
      open,
      title: 'Delete this account?',
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    },
  })
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const wrapper = mountDialog(false)
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })

  it('renders the title and body when open', () => {
    const wrapper = mountDialog(true)
    expect(wrapper.text()).toContain('Delete this account?')
    expect(wrapper.text()).toContain('This cannot be undone.')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('.confirm-dialog__confirm').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mountDialog(true)
    await wrapper.find('.confirm-dialog__cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ConfirmDialog.spec.ts`
Expected: FAIL with "Failed to resolve import './ConfirmDialog.vue'"

- [ ] **Step 3: Implement**

Create `frontend/src/components/ConfirmDialog.vue`:

```vue
<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="confirm-dialog"
    role="dialog"
    aria-modal="true"
  >
    <div class="confirm-dialog__panel">
      <h2>{{ title }}</h2>
      <p>{{ body }}</p>
      <div class="confirm-dialog__actions">
        <button
          type="button"
          class="confirm-dialog__cancel"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="confirm-dialog__confirm"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.confirm-dialog__panel {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  box-shadow: var(--shadow);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.confirm-dialog__confirm {
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
}

.confirm-dialog__cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 16px;
  color: var(--text-h);
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ConfirmDialog.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ConfirmDialog.vue frontend/src/components/ConfirmDialog.spec.ts
git commit -m "feat(frontend): add reusable ConfirmDialog component

Modified files:
- frontend/src/components/ConfirmDialog.vue — new, generic open/confirm/cancel dialog
- frontend/src/components/ConfirmDialog.spec.ts — new, open state and emit coverage"
```

---

### Task 9: Frontend - `components/ResendVerificationForm.vue`

**Files:**
- Create: `frontend/src/components/ResendVerificationForm.vue`
- Modify: `frontend/src/locales/en.json`
- Test: `frontend/src/components/ResendVerificationForm.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 6) - `resendStatus`, `resendErrorKind`, `resendVerification(email)`.
- Produces: prop `initialEmail?: string` (defaults to `''`). Consumed by Task 10 (`LoginForm.vue`) and Task 14 (`VerifyEmailView.vue`).

- [ ] **Step 1: Add the locale keys**

In `frontend/src/locales/en.json`, add a top-level `"auth"` key. Since this is the first auth-related component, create the `auth` object now with just the keys this task needs; later tasks extend it. Insert it after the `"key"` block and before `"errors"`:

```json
  "auth": {
    "resendVerification": {
      "form": {
        "email": {
          "label": "Email"
        },
        "submit": {
          "label": "Resend",
          "loading": "Sending..."
        }
      },
      "success": "If an account with this email exists, a verification email has been sent."
    }
  },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/ResendVerificationForm.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ResendVerificationForm from './ResendVerificationForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountForm(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(ResendVerificationForm, {
    props,
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('ResendVerificationForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('pre-fills the email field from the initialEmail prop', () => {
    const wrapper = mountForm({ initialEmail: 'user@example.com' })
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('user@example.com')
  })

  it('submits the entered email', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/resend-verification', { email: 'user@example.com' })
  })

  it('shows the generic success message after a successful submit', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'ok' })
    const wrapper = mountForm({ initialEmail: 'user@example.com' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.resendVerification.success)
  })

  it('shows a network error message on a network failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const wrapper = mountForm({ initialEmail: 'user@example.com' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.errors.network)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ResendVerificationForm.spec.ts`
Expected: FAIL with "Failed to resolve import './ResendVerificationForm.vue'"

- [ ] **Step 4: Implement**

Create `frontend/src/components/ResendVerificationForm.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadingSpinner from './LoadingSpinner.vue'

const props = withDefaults(defineProps<{ initialEmail?: string }>(), { initialEmail: '' })

const { t } = useI18n()
const authStore = useAuthStore()
const email = ref(props.initialEmail)

const canSubmit = computed(() => authStore.resendStatus !== 'loading' && email.value.trim().length > 0)

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.resendVerification(email.value)
}
</script>

<template>
  <form
    class="resend-verification-form"
    :aria-busy="authStore.resendStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.resendVerification.form.email.label') }}
      <input
        v-model="email"
        type="email"
        required
      >
    </label>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.resendStatus === 'loading'" />
      {{ authStore.resendStatus === 'loading' ? t('auth.resendVerification.form.submit.loading') : t('auth.resendVerification.form.submit.label') }}
    </button>
    <p
      v-if="authStore.resendStatus === 'success'"
      class="resend-verification-form__success"
      role="status"
    >
      {{ t('auth.resendVerification.success') }}
    </p>
    <p
      v-else-if="authStore.resendStatus === 'error'"
      class="resend-verification-form__error"
      role="alert"
    >
      {{ t(`errors.${authStore.resendErrorKind}`) }}
    </p>
  </form>
</template>

<style scoped>
.resend-verification-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resend-verification-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resend-verification-form__error {
  color: var(--danger);
}

.resend-verification-form__success {
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ResendVerificationForm.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ResendVerificationForm.vue frontend/src/components/ResendVerificationForm.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add ResendVerificationForm component

Modified files:
- frontend/src/components/ResendVerificationForm.vue — new, submits email, shows the anti-enumeration success message
- frontend/src/components/ResendVerificationForm.spec.ts — new, prefill/submit/success/error coverage
- frontend/src/locales/en.json — add auth.resendVerification.* keys"
```

---

### Task 10: Frontend - `components/LoginForm.vue`

**Files:**
- Create: `frontend/src/components/LoginForm.vue`
- Modify: `frontend/src/locales/en.json`
- Test: `frontend/src/components/LoginForm.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 6) - `loginStatus`, `loginErrorKind`, `login(email, password)`; `ResendVerificationForm` (Task 9).
- Produces: no props, no emits - `LoginView.vue` (Task 12) reads success by watching `authStore.loginStatus`.

- [ ] **Step 1: Add the locale keys**

In `frontend/src/locales/en.json`, add a `"login"` key inside the existing `"auth"` object (alongside `"resendVerification"`):

```json
    "login": {
      "title": "Log in",
      "form": {
        "email": {
          "label": "Email"
        },
        "password": {
          "label": "Password"
        },
        "submit": {
          "label": "Log in",
          "loading": "Logging in..."
        },
        "error": {
          "invalidCredentials": "Incorrect email or password.",
          "disabled": "This account has been disabled.",
          "unverified": "Please verify your email address before logging in."
        }
      }
    },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/LoginForm.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import LoginForm from './LoginForm.vue'
import ResendVerificationForm from './ResendVerificationForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(LoginForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  it('submits the entered credentials', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'Password-123!' })
  })

  it('disables the submit button while a login request is in flight', async () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('shows a generic invalid-credentials message on a plain 401 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid credentials', 'http', 401))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong-password')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.invalidCredentials)
  })

  it('shows the disabled-account message on a 403 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('This account has been disabled', 'http', 403))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.disabled)
  })

  it('shows the resend verification form on an unverified-email response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Email address not verified', 'http', 401))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.login.form.error.unverified)
    expect(wrapper.findComponent(ResendVerificationForm).exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/LoginForm.spec.ts`
Expected: FAIL with "Failed to resolve import './LoginForm.vue'"

- [ ] **Step 4: Implement**

Create `frontend/src/components/LoginForm.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadingSpinner from './LoadingSpinner.vue'
import ResendVerificationForm from './ResendVerificationForm.vue'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const canSubmit = computed(() => {
  return authStore.loginStatus !== 'loading' && email.value.trim().length > 0 && password.value.length > 0
})

const errorMessage = computed(() => {
  const kind = authStore.loginErrorKind
  if (!kind) return null
  if (kind === 'network' || kind === 'unknown') return t(`errors.${kind}`)
  return t(`auth.login.form.error.${kind}`)
})

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.login(email.value, password.value)
}
</script>

<template>
  <form
    class="login-form"
    :aria-busy="authStore.loginStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.login.form.email.label') }}
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        required
      >
    </label>
    <label>
      {{ t('auth.login.form.password.label') }}
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      >
    </label>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.loginStatus === 'loading'" />
      {{ authStore.loginStatus === 'loading' ? t('auth.login.form.submit.loading') : t('auth.login.form.submit.label') }}
    </button>
    <p
      v-if="authStore.loginStatus === 'error' && errorMessage"
      class="login-form__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <ResendVerificationForm
      v-if="authStore.loginErrorKind === 'unverified'"
      :initial-email="email"
    />
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-form__error {
  color: var(--danger);
}
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/LoginForm.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/LoginForm.vue frontend/src/components/LoginForm.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add LoginForm component

Modified files:
- frontend/src/components/LoginForm.vue — new, submits credentials, branches on invalid/disabled/unverified
- frontend/src/components/LoginForm.spec.ts — new, submit and error-branch coverage
- frontend/src/locales/en.json — add auth.login.* keys"
```

---

### Task 11: Frontend - `components/RegisterForm.vue`

**Files:**
- Create: `frontend/src/components/RegisterForm.vue`
- Modify: `frontend/src/locales/en.json`
- Test: `frontend/src/components/RegisterForm.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 6) - `registerStatus`, `registerErrorKind`, `registerErrorMessage`, `register(email, password)`; `evaluatePassword`, `isPasswordValid` from `../utils/password-strength` (Task 5).
- Produces: no props, no emits - `RegisterView.vue` (Task 13) reads success by checking `authStore.registerStatus`.

- [ ] **Step 1: Add the locale keys**

In `frontend/src/locales/en.json`, add a `"register"` key inside `"auth"`:

```json
    "register": {
      "title": "Create an account",
      "form": {
        "email": {
          "label": "Email"
        },
        "password": {
          "label": "Password",
          "criteria": {
            "minLength": "At least 12 characters",
            "lowercase": "One lowercase letter",
            "uppercase": "One uppercase letter",
            "digit": "One digit",
            "special": "One special character"
          }
        },
        "submit": {
          "label": "Register",
          "loading": "Registering..."
        },
        "error": {
          "duplicateEmail": "An account with this email already exists."
        }
      },
      "success": {
        "heading": "Check your email",
        "body": "We've sent a verification link to your email address. Follow it to activate your account."
      }
    },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/RegisterForm.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegisterForm from './RegisterForm.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountForm() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(RegisterForm, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('RegisterForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('disables submit until every password criterion is met', async () => {
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('weak')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('marks each password criterion as met once satisfied', async () => {
    const wrapper = mountForm()
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    const metItems = wrapper.findAll('.register-form__criteria-met')
    expect(metItems).toHaveLength(5)
  })

  it('submits the entered email and password', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountForm()

    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/register', { email: 'new@example.com', password: 'Correct-Horse-Battery9' })
  })

  it('shows a duplicate-email message on a 409 response', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('An account with this email already exists', 'http', 409))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('taken@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.register.form.error.duplicateEmail)
  })

  it('shows the backend validation message on a 400 response', async () => {
    const message =
      'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character';
    vi.mocked(postJson).mockRejectedValue(new ApiError(message, 'http', 400))
    const wrapper = mountForm()
    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(message)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/RegisterForm.spec.ts`
Expected: FAIL with "Failed to resolve import './RegisterForm.vue'"

- [ ] **Step 4: Implement**

Create `frontend/src/components/RegisterForm.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { evaluatePassword, isPasswordValid } from '../utils/password-strength'
import LoadingSpinner from './LoadingSpinner.vue'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const criteria = computed(() => evaluatePassword(password.value))

const canSubmit = computed(() => {
  return authStore.registerStatus !== 'loading' && email.value.trim().length > 0 && isPasswordValid(password.value)
})

const errorMessage = computed(() => {
  const kind = authStore.registerErrorKind
  if (!kind) return null
  if (kind === 'duplicateEmail') return t('auth.register.form.error.duplicateEmail')
  if (kind === 'validation') return authStore.registerErrorMessage ?? t('errors.unknown')
  return t(`errors.${kind}`)
})

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await authStore.register(email.value, password.value)
}
</script>

<template>
  <form
    class="register-form"
    :aria-busy="authStore.registerStatus === 'loading'"
    @submit.prevent="handleSubmit"
  >
    <label>
      {{ t('auth.register.form.email.label') }}
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        required
      >
    </label>
    <label>
      {{ t('auth.register.form.password.label') }}
      <input
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      >
    </label>
    <ul class="register-form__criteria">
      <li :class="{ 'register-form__criteria-met': criteria.minLength }">
        {{ t('auth.register.form.password.criteria.minLength') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.lowercase }">
        {{ t('auth.register.form.password.criteria.lowercase') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.uppercase }">
        {{ t('auth.register.form.password.criteria.uppercase') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.digit }">
        {{ t('auth.register.form.password.criteria.digit') }}
      </li>
      <li :class="{ 'register-form__criteria-met': criteria.special }">
        {{ t('auth.register.form.password.criteria.special') }}
      </li>
    </ul>
    <button
      type="submit"
      :disabled="!canSubmit"
    >
      <LoadingSpinner v-if="authStore.registerStatus === 'loading'" />
      {{ authStore.registerStatus === 'loading' ? t('auth.register.form.submit.loading') : t('auth.register.form.submit.label') }}
    </button>
    <p
      v-if="authStore.registerStatus === 'error' && errorMessage"
      class="register-form__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </form>
</template>

<style scoped>
.register-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.register-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.register-form__criteria {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-muted);
  font-size: 0.9em;
}

.register-form__criteria-met {
  color: var(--accent);
}

.register-form__error {
  color: var(--danger);
}
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/RegisterForm.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/RegisterForm.vue frontend/src/components/RegisterForm.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add RegisterForm component

Modified files:
- frontend/src/components/RegisterForm.vue — new, live password-criteria feedback, submits registration
- frontend/src/components/RegisterForm.spec.ts — new, criteria/submit/error coverage
- frontend/src/locales/en.json — add auth.register.* keys"
```

---

### Task 12: Frontend - `views/LoginView.vue`

**Files:**
- Create: `frontend/src/views/LoginView.vue`
- Test: `frontend/src/views/LoginView.spec.ts`

**Interfaces:**
- Consumes: `LoginForm` (Task 10), `useAuthStore` (Task 6, watches `loginStatus`), `useRoute`/`useRouter`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/views/LoginView.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import en from '../locales/en.json'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

async function mountView(initialPath = '/login') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/encode', name: 'encode', component: { template: '<div>encode</div>' } },
    ],
  })
  router.push(initialPath)
  await router.isReady()

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  const wrapper = mount(LoginView, {
    global: { plugins: [createPinia(), i18n, router] },
  })
  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  it('redirects to /encode after a successful login with no redirect query', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const { wrapper, router } = await mountView('/login')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('redirects to the redirect query target after a successful login', async () => {
    vi.mocked(postJson).mockResolvedValue({ accessToken: 'jwt-token' })
    vi.mocked(getJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const { wrapper, router } = await mountView('/login?redirect=%2Fkey')

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('Password-123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/key')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/views/LoginView.spec.ts`
Expected: FAIL with "Failed to resolve import './LoginView.vue'"

- [ ] **Step 3: Implement**

Create `frontend/src/views/LoginView.vue`:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoginForm from '../components/LoginForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

watch(
  () => authStore.loginStatus,
  (status) => {
    if (status === 'success') {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/encode'
      void router.push(redirect)
    }
  },
)
</script>

<template>
  <div class="login-view">
    <h1>{{ t('auth.login.title') }}</h1>
    <LoginForm />
    <router-link to="/register">
      {{ t('auth.register.title') }}
    </router-link>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/views/LoginView.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/LoginView.vue frontend/src/views/LoginView.spec.ts
git commit -m "feat(frontend): add LoginView

Modified files:
- frontend/src/views/LoginView.vue — new, redirects to the redirect query target (or /encode) on successful login
- frontend/src/views/LoginView.spec.ts — new, redirect coverage"
```

---

### Task 13: Frontend - `views/RegisterView.vue`

**Files:**
- Create: `frontend/src/views/RegisterView.vue`
- Test: `frontend/src/views/RegisterView.spec.ts`

**Interfaces:**
- Consumes: `RegisterForm` (Task 11), `useAuthStore` (Task 6, reads `registerStatus`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/views/RegisterView.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegisterView from './RegisterView.vue'
import en from '../locales/en.json'
import { MOCK_PUBLIC_USER } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(RegisterView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('shows the register form before submitting', () => {
    const wrapper = mountView()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('swaps the form for a "check your email" panel after a successful registration', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_PUBLIC_USER)
    const wrapper = mountView()

    await wrapper.find('input[type="email"]').setValue('new@example.com')
    await wrapper.find('input[type="password"]').setValue('Correct-Horse-Battery9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain(en.auth.register.success.heading)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/views/RegisterView.spec.ts`
Expected: FAIL with "Failed to resolve import './RegisterView.vue'"

- [ ] **Step 3: Implement**

Create `frontend/src/views/RegisterView.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import RegisterForm from '../components/RegisterForm.vue'

const { t } = useI18n()
const authStore = useAuthStore()
</script>

<template>
  <div class="register-view">
    <h1>{{ t('auth.register.title') }}</h1>
    <RegisterForm v-if="authStore.registerStatus !== 'success'" />
    <div
      v-else
      class="register-view__success"
      role="status"
    >
      <h2>{{ t('auth.register.success.heading') }}</h2>
      <p>{{ t('auth.register.success.body') }}</p>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
  text-align: center;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/views/RegisterView.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/RegisterView.vue frontend/src/views/RegisterView.spec.ts
git commit -m "feat(frontend): add RegisterView

Modified files:
- frontend/src/views/RegisterView.vue — new, swaps to a check-your-email panel on success
- frontend/src/views/RegisterView.spec.ts — new, form/success-panel coverage"
```

---

### Task 14: Frontend - `views/VerifyEmailView.vue`

**Files:**
- Create: `frontend/src/views/VerifyEmailView.vue`
- Modify: `frontend/src/locales/en.json`
- Test: `frontend/src/views/VerifyEmailView.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 6, calls `verifyEmail(token)`, reads `verifyStatus`), `ResendVerificationForm` (Task 9), `useRoute`.

- [ ] **Step 1: Add the locale keys**

In `frontend/src/locales/en.json`, add a `"verifyEmail"` key inside `"auth"`:

```json
    "verifyEmail": {
      "title": "Email verification",
      "success": "Your email address has been verified. You can now log in.",
      "loginLink": "Go to login",
      "error": "This verification link is invalid or has expired."
    },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/views/VerifyEmailView.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import VerifyEmailView from './VerifyEmailView.vue'
import en from '../locales/en.json'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

async function mountView(token: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
    ],
  })
  router.push(`/verify-email?token=${token}`)
  await router.isReady()

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(VerifyEmailView, {
    global: { plugins: [createPinia(), i18n, router] },
  })
}

describe('VerifyEmailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('calls verify-email automatically on mount with the token from the query', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
    await mountView('valid-token')
    await flushPromises()

    expect(postJson).toHaveBeenCalledWith('/auth/verify-email', { token: 'valid-token' })
  })

  it('shows a success message and a login link on success', async () => {
    vi.mocked(postJson).mockResolvedValue({ message: 'Email verified successfully' })
    const wrapper = await mountView('valid-token')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.verifyEmail.success)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })

  it('shows an error and the resend-verification form on an invalid token', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Invalid or expired verification token', 'http', 400))
    const wrapper = await mountView('bad-token')
    await flushPromises()

    expect(wrapper.text()).toContain(en.auth.verifyEmail.error)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/views/VerifyEmailView.spec.ts`
Expected: FAIL with "Failed to resolve import './VerifyEmailView.vue'"

- [ ] **Step 4: Implement**

Create `frontend/src/views/VerifyEmailView.vue`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import ResendVerificationForm from '../components/ResendVerificationForm.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

onMounted(() => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  void authStore.verifyEmail(token)
})
</script>

<template>
  <div class="verify-email-view">
    <h1>{{ t('auth.verifyEmail.title') }}</h1>
    <p v-if="authStore.verifyStatus === 'success'">
      {{ t('auth.verifyEmail.success') }}
      <router-link to="/login">
        {{ t('auth.verifyEmail.loginLink') }}
      </router-link>
    </p>
    <div v-else-if="authStore.verifyStatus === 'error'">
      <p role="alert">
        {{ t('auth.verifyEmail.error') }}
      </p>
      <ResendVerificationForm />
    </div>
  </div>
</template>

<style scoped>
.verify-email-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
  text-align: center;
}
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/views/VerifyEmailView.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/VerifyEmailView.vue frontend/src/views/VerifyEmailView.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add VerifyEmailView

Modified files:
- frontend/src/views/VerifyEmailView.vue — new, verifies automatically on mount, shows resend form on failure
- frontend/src/views/VerifyEmailView.spec.ts — new, success/error coverage
- frontend/src/locales/en.json — add auth.verifyEmail.* keys"
```

---

### Task 15: Frontend - `router/index.ts` routes and guard

**Files:**
- Modify: `frontend/src/router/index.ts`
- Test: `frontend/src/router/index.spec.ts` (new)

**Interfaces:**
- Consumes: `useAuthStore` (Task 6) - `accessToken` getter, `user` state; `LoginView`, `RegisterView`, `VerifyEmailView` (Tasks 12-14); `AdminUsersView` (Task 17, stubbed here as a placeholder import until Task 17 lands - see Step 3 note).

Task 17 (`AdminUsersView.vue`) does not exist yet at this point in the plan. To keep this task's route table complete without a placeholder component, `AdminUsersView.vue` is created as a minimal stub in this task and fleshed out in Task 17 - this is not a placeholder in the "TBD" sense, it is a real, working component that Task 17 extends.

- [ ] **Step 1: Create the minimal `AdminUsersView.vue` stub**

Create `frontend/src/views/AdminUsersView.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="admin-users-view">
    <h1>{{ t('admin.users.title') }}</h1>
  </div>
</template>
```

Add the `"admin"` key to `frontend/src/locales/en.json`, after the `"auth"` block and before `"errors"`:

```json
  "admin": {
    "users": {
      "title": "User management"
    }
  },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/router/index.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { router } from './index'
import { useAuthStore } from '../stores/auth'
import { setAccessToken, clearAccessToken } from '../auth/token-storage'
import { MOCK_PUBLIC_USER, MOCK_ADMIN_USER } from '../__fixtures__/frontend.fixtures'

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    clearAccessToken()
    await router.push('/')
    await router.isReady()
  })

  it('redirects an unauthenticated visitor to /login with a redirect query on a protected route', async () => {
    await router.push('/encode')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/encode')
  })

  it('allows an authenticated visitor to reach a protected route', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_PUBLIC_USER

    await router.push('/encode')

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('redirects a non-admin visitor away from /admin/users', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_PUBLIC_USER

    await router.push('/admin/users')

    expect(router.currentRoute.value.path).toBe('/encode')
  })

  it('allows an admin visitor to reach /admin/users', async () => {
    setAccessToken('jwt-token')
    const authStore = useAuthStore()
    authStore.user = MOCK_ADMIN_USER

    await router.push('/admin/users')

    expect(router.currentRoute.value.path).toBe('/admin/users')
  })

  it('does not gate /login', async () => {
    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/login')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/router/index.spec.ts`
Expected: FAIL - `/login`, `/register`, `/verify-email`, `/admin/users` do not exist yet, and there is no guard, so every redirect assertion fails.

- [ ] **Step 4: Implement**

Replace the contents of `frontend/src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import EncodeView from '../views/EncodeView.vue'
import DecodeView from '../views/DecodeView.vue'
import KeyView from '../views/KeyView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import VerifyEmailView from '../views/VerifyEmailView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/encode' },
    { path: '/encode', name: 'encode', component: EncodeView, meta: { requiresAuth: true } },
    { path: '/decode', name: 'decode', component: DecodeView, meta: { requiresAuth: true } },
    { path: '/key', name: 'key', component: KeyView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.accessToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    return { path: '/encode' }
  }

  return true
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/router/index.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/router/index.spec.ts frontend/src/views/AdminUsersView.vue frontend/src/locales/en.json
git commit -m "feat(frontend): add auth routes and a route guard

Modified files:
- frontend/src/router/index.ts — add /login, /register, /verify-email, /admin/users routes and a beforeEach guard
- frontend/src/router/index.spec.ts — new, unauthenticated/non-admin/admin redirect coverage
- frontend/src/views/AdminUsersView.vue — new minimal stub, extended in a later task
- frontend/src/locales/en.json — add admin.users.title key"
```

---

### Task 16: Frontend - `stores/admin.ts`

**Files:**
- Create: `frontend/src/stores/admin.ts`
- Modify: `frontend/src/__fixtures__/frontend.fixtures.ts`
- Test: `frontend/src/stores/admin.spec.ts`

**Interfaces:**
- Consumes: `getJson`, `patchJson`, `deleteJson`, `ApiError` from `../api/client` (Task 4).
- Produces: `useAdminStore()` with state `users: AdminUserSummary[]`, `status: 'idle' | 'loading' | 'success' | 'error'`, `errorMessage: string | null`; actions `fetchUsers(): Promise<void>`, `setActive(id, active): Promise<void>`, `removeUser(id): Promise<void>`. `AdminUserSummary` type exported for Task 17.

- [ ] **Step 1: Add the fixture the test needs**

Append to `frontend/src/__fixtures__/frontend.fixtures.ts` (add the import alongside the existing ones at the top):

```ts
import type { AdminUserSummary } from '../stores/admin'
```

And append at the end of the file:

```ts
export const MOCK_ADMIN_USERS_LIST: AdminUserSummary[] = [
  { id: 'user-1', email: 'user1@example.com', role: 'USER', active: true, emailVerified: true, createdAt: '2026-09-01T00:00:00.000Z' },
  { id: 'user-2', email: 'user2@example.com', role: 'USER', active: false, emailVerified: false, createdAt: '2026-09-02T00:00:00.000Z' },
]
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/stores/admin.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminStore } from './admin'
import { ApiError } from '../api/client'
import { MOCK_ADMIN_USERS_LIST } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, getJson: vi.fn(), patchJson: vi.fn(), deleteJson: vi.fn() }
})

import { getJson, patchJson, deleteJson } from '../api/client'

describe('useAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getJson).mockReset()
    vi.mocked(patchJson).mockReset()
    vi.mocked(deleteJson).mockReset()
  })

  describe('fetchUsers', () => {
    it('stores the returned user list on success', async () => {
      vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
      const store = useAdminStore()

      await store.fetchUsers()

      expect(getJson).toHaveBeenCalledWith('/admin/users')
      expect(store.users).toEqual(MOCK_ADMIN_USERS_LIST)
      expect(store.status).toBe('success')
    })

    it('sets an error message on failure', async () => {
      vi.mocked(getJson).mockRejectedValue(new ApiError('Forbidden', 'http', 403))
      const store = useAdminStore()

      await store.fetchUsers()

      expect(store.status).toBe('error')
      expect(store.errorMessage).toBe('Forbidden')
    })
  })

  describe('setActive', () => {
    it('replaces the updated user in the list', async () => {
      vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
      const store = useAdminStore()
      await store.fetchUsers()
      const updated = { ...MOCK_ADMIN_USERS_LIST[0], active: false }
      vi.mocked(patchJson).mockResolvedValue(updated)

      await store.setActive(updated.id, false)

      expect(patchJson).toHaveBeenCalledWith(`/admin/users/${updated.id}`, { active: false })
      expect(store.users.find((u) => u.id === updated.id)).toEqual(updated)
    })

    it('sets an error message and rethrows on a self-modification rejection', async () => {
      vi.mocked(patchJson).mockRejectedValue(new ApiError('You cannot modify your own account', 'http', 400))
      const store = useAdminStore()

      await expect(store.setActive('self-id', false)).rejects.toBeInstanceOf(ApiError)
      expect(store.errorMessage).toBe('You cannot modify your own account')
    })
  })

  describe('removeUser', () => {
    it('removes the deleted user from the list', async () => {
      vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
      const store = useAdminStore()
      await store.fetchUsers()
      vi.mocked(deleteJson).mockResolvedValue(undefined)

      await store.removeUser(MOCK_ADMIN_USERS_LIST[0].id)

      expect(deleteJson).toHaveBeenCalledWith(`/admin/users/${MOCK_ADMIN_USERS_LIST[0].id}`)
      expect(store.users.find((u) => u.id === MOCK_ADMIN_USERS_LIST[0].id)).toBeUndefined()
    })

    it('sets an error message and rethrows on a self-deletion rejection', async () => {
      vi.mocked(deleteJson).mockRejectedValue(new ApiError('You cannot delete your own account', 'http', 400))
      const store = useAdminStore()

      await expect(store.removeUser('self-id')).rejects.toBeInstanceOf(ApiError)
      expect(store.errorMessage).toBe('You cannot delete your own account')
    })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/admin.spec.ts`
Expected: FAIL with "Cannot find module './admin'"

- [ ] **Step 4: Implement**

Create `frontend/src/stores/admin.ts`:

```ts
import { defineStore } from 'pinia'
import { getJson, patchJson, deleteJson, ApiError } from '../api/client'
import type { UserRole } from './auth'

/** Mirrors backend/src/admin/admin-users.service.ts's AdminUserSummary - never includes passwordHash. */
export interface AdminUserSummary {
  id: string
  email: string
  role: UserRole
  active: boolean
  emailVerified: boolean
  createdAt: string
}

type AdminStatus = 'idle' | 'loading' | 'success' | 'error'

interface AdminState {
  users: AdminUserSummary[]
  status: AdminStatus
  errorMessage: string | null
}

function initialState(): AdminState {
  return {
    users: [],
    status: 'idle',
    errorMessage: null,
  }
}

function describeError(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong'
}

export const useAdminStore = defineStore('admin', {
  state: initialState,
  actions: {
    async fetchUsers(): Promise<void> {
      this.status = 'loading'
      this.errorMessage = null
      try {
        this.users = await getJson<AdminUserSummary[]>('/admin/users')
        this.status = 'success'
      } catch (err) {
        this.status = 'error'
        this.errorMessage = describeError(err)
      }
    },

    async setActive(id: string, active: boolean): Promise<void> {
      this.errorMessage = null
      try {
        const updated = await patchJson<AdminUserSummary>(`/admin/users/${id}`, { active })
        const index = this.users.findIndex((user) => user.id === id)
        if (index !== -1) this.users[index] = updated
      } catch (err) {
        this.errorMessage = describeError(err)
        throw err
      }
    },

    async removeUser(id: string): Promise<void> {
      this.errorMessage = null
      try {
        await deleteJson(`/admin/users/${id}`)
        this.users = this.users.filter((user) => user.id !== id)
      } catch (err) {
        this.errorMessage = describeError(err)
        throw err
      }
    },
  },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/admin.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/admin.ts frontend/src/stores/admin.spec.ts frontend/src/__fixtures__/frontend.fixtures.ts
git commit -m "feat(frontend): add admin store

Modified files:
- frontend/src/stores/admin.ts — new, fetchUsers/setActive/removeUser
- frontend/src/stores/admin.spec.ts — new, success and self-action-rejection coverage
- frontend/src/__fixtures__/frontend.fixtures.ts — add MOCK_ADMIN_USERS_LIST"
```

---

### Task 17: Frontend - flesh out `views/AdminUsersView.vue`

**Files:**
- Modify: `frontend/src/views/AdminUsersView.vue`
- Modify: `frontend/src/locales/en.json`
- Test: `frontend/src/views/AdminUsersView.spec.ts`

**Interfaces:**
- Consumes: `useAdminStore` (Task 16), `ConfirmDialog` (Task 8).

- [ ] **Step 1: Extend the locale keys**

In `frontend/src/locales/en.json`, replace the `"admin"` block added in Task 15 with:

```json
  "admin": {
    "users": {
      "title": "User management",
      "table": {
        "email": "Email",
        "role": "Role",
        "verified": "Verified",
        "active": "Active",
        "createdAt": "Created",
        "actions": "Actions"
      },
      "actions": {
        "activate": "Activate",
        "deactivate": "Deactivate",
        "delete": "Delete"
      },
      "confirmDelete": {
        "title": "Delete this account?",
        "body": "This will permanently delete {email}'s account. This cannot be undone.",
        "confirm": "Delete",
        "cancel": "Cancel"
      },
      "error": {
        "prefix": "Couldn't complete this action: {detail}"
      }
    }
  },
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/views/AdminUsersView.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AdminUsersView from './AdminUsersView.vue'
import en from '../locales/en.json'
import { MOCK_ADMIN_USERS_LIST } from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, getJson: vi.fn(), patchJson: vi.fn(), deleteJson: vi.fn() }
})

import { getJson, patchJson, deleteJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(AdminUsersView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

describe('AdminUsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getJson).mockReset()
    vi.mocked(patchJson).mockReset()
    vi.mocked(deleteJson).mockReset()
  })

  it('fetches and renders the user list on mount', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    const wrapper = mountView()
    await flushPromises()

    expect(getJson).toHaveBeenCalledWith('/admin/users')
    expect(wrapper.text()).toContain('user1@example.com')
    expect(wrapper.text()).toContain('user2@example.com')
  })

  it('toggles a user active state when the activate/deactivate button is clicked', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    vi.mocked(patchJson).mockResolvedValue({ ...MOCK_ADMIN_USERS_LIST[0], active: false })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(patchJson).toHaveBeenCalledWith('/admin/users/user-1', { active: false })
  })

  it('opens a confirmation dialog before deleting, and deletes only on confirm', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    vi.mocked(deleteJson).mockResolvedValue(undefined)
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.delete)[0].trigger('click')

    expect(deleteJson).not.toHaveBeenCalled()
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)

    await wrapper.find('.confirm-dialog__confirm').trigger('click')
    await flushPromises()

    expect(deleteJson).toHaveBeenCalledWith('/admin/users/user-1')
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false)
  })

  it('shows the backend error message when an action is rejected', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_ADMIN_USERS_LIST)
    vi.mocked(patchJson).mockRejectedValue(new ApiError('You cannot modify your own account', 'http', 400))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').filter((b) => b.text() === en.admin.users.actions.deactivate)[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You cannot modify your own account')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/views/AdminUsersView.spec.ts`
Expected: FAIL - the stub view renders no table, no buttons, and never calls `adminStore.fetchUsers()`.

- [ ] **Step 4: Implement**

Replace the contents of `frontend/src/views/AdminUsersView.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore, type AdminUserSummary } from '../stores/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const { t } = useI18n()
const adminStore = useAdminStore()

const pendingDelete = ref<AdminUserSummary | null>(null)

onMounted(() => {
  void adminStore.fetchUsers()
})

function toggleActive(user: AdminUserSummary): void {
  void adminStore.setActive(user.id, !user.active)
}

function requestDelete(user: AdminUserSummary): void {
  pendingDelete.value = user
}

function cancelDelete(): void {
  pendingDelete.value = null
}

async function confirmDelete(): Promise<void> {
  if (!pendingDelete.value) return
  await adminStore.removeUser(pendingDelete.value.id)
  pendingDelete.value = null
}
</script>

<template>
  <div class="admin-users-view">
    <h1>{{ t('admin.users.title') }}</h1>
    <p
      v-if="adminStore.status === 'error'"
      class="admin-users-view__error"
      role="alert"
    >
      {{ t('admin.users.error.prefix', { detail: adminStore.errorMessage }) }}
    </p>
    <table
      v-if="adminStore.users.length > 0"
      class="admin-users-view__table"
    >
      <thead>
        <tr>
          <th>{{ t('admin.users.table.email') }}</th>
          <th>{{ t('admin.users.table.role') }}</th>
          <th>{{ t('admin.users.table.verified') }}</th>
          <th>{{ t('admin.users.table.active') }}</th>
          <th>{{ t('admin.users.table.createdAt') }}</th>
          <th>{{ t('admin.users.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in adminStore.users"
          :key="user.id"
        >
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>{{ user.emailVerified }}</td>
          <td>{{ user.active }}</td>
          <td>{{ user.createdAt }}</td>
          <td>
            <button
              type="button"
              @click="toggleActive(user)"
            >
              {{ user.active ? t('admin.users.actions.deactivate') : t('admin.users.actions.activate') }}
            </button>
            <button
              type="button"
              @click="requestDelete(user)"
            >
              {{ t('admin.users.actions.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('admin.users.confirmDelete.title')"
      :body="pendingDelete ? t('admin.users.confirmDelete.body', { email: pendingDelete.email }) : ''"
      :confirm-label="t('admin.users.confirmDelete.confirm')"
      :cancel-label="t('admin.users.confirmDelete.cancel')"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.admin-users-view__table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.admin-users-view__table th,
.admin-users-view__table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.admin-users-view__error {
  color: var(--danger);
}
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/views/AdminUsersView.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/AdminUsersView.vue frontend/src/views/AdminUsersView.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): build out the admin users table

Modified files:
- frontend/src/views/AdminUsersView.vue — list users, toggle active, delete with confirmation
- frontend/src/views/AdminUsersView.spec.ts — new, fetch/toggle/delete/error coverage
- frontend/src/locales/en.json — extend admin.users.* keys (table, actions, confirmDelete, error)"
```

---

### Task 18: Frontend - `layouts/AppLayout.vue` nav and session-expiry watcher

**Files:**
- Modify: `frontend/src/layouts/AppLayout.vue`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `useAuthStore` (Task 6) - `accessToken` getter, `user` state, `logout()`.

`frontend/src/layouts/**` is excluded from coverage thresholds (`frontend/vite.config.ts`) and `AppLayout.vue` had no existing spec before this task - consistent with that existing project convention, this task has no test step.

- [ ] **Step 1: Add the locale keys**

In `frontend/src/locales/en.json`, add a `"nav"` key inside `"auth"`, and an `"admin"` key inside the top-level `"nav"` object:

```json
    "nav": {
      "login": "Log in",
      "logout": "Log out"
    },
```

(inside `"auth"`), and:

```json
  "nav": {
    "encode": "Encode",
    "decode": "Decode",
    "key": "Key",
    "admin": "Admin"
  },
```

(replacing the existing top-level `"nav"` block, which currently has no `"admin"` key).

- [ ] **Step 2: Implement**

Replace the contents of `frontend/src/layouts/AppLayout.vue`:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Handles the mid-session case: a token that dies while already on a
// protected route (api/client.ts's 401 handling clears it). The router
// guard already covers the pre-navigation case; this is the other half of
// spec Decision 5's single redirect owner.
watch(
  () => authStore.accessToken,
  (token, previousToken) => {
    if (previousToken && !token && route.meta.requiresAuth) {
      void router.push({ path: '/login', query: { redirect: route.fullPath } })
    }
  },
)

function handleLogout(): void {
  authStore.logout()
  void router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <nav class="app-layout__nav">
      <router-link to="/encode">
        {{ t('nav.encode') }}
      </router-link>
      <router-link to="/decode">
        {{ t('nav.decode') }}
      </router-link>
      <router-link to="/key">
        {{ t('nav.key') }}
      </router-link>
      <router-link
        v-if="authStore.user?.role === 'ADMIN'"
        to="/admin/users"
      >
        {{ t('nav.admin') }}
      </router-link>
      <span class="app-layout__nav-spacer" />
      <router-link
        v-if="!authStore.accessToken"
        to="/login"
      >
        {{ t('auth.nav.login') }}
      </router-link>
      <button
        v-else
        type="button"
        class="app-layout__logout"
        @click="handleLogout"
      >
        {{ t('auth.nav.logout') }}
      </button>
    </nav>
    <main class="app-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout__nav {
  display: flex;
  align-items: center;
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

.app-layout__nav-spacer {
  flex: 1;
}

.app-layout__logout {
  background: none;
  border: none;
  color: var(--text-h);
  font-weight: 500;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}

.app-layout__content {
  padding: 16px;
}
</style>
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd frontend && npm run test`
Expected: PASS - all specs from Tasks 3-17 plus every pre-existing spec.

- [ ] **Step 4: Run coverage and confirm thresholds hold**

Run: `cd frontend && npm run test:cov`
Expected: PASS - 85%+ branches/functions/lines/statements on everything under `src/**` except `main.ts`, `App.vue`, `router/**`, `layouts/**`, `__fixtures__/**`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/AppLayout.vue frontend/src/locales/en.json
git commit -m "feat(frontend): add auth nav state and session-expiry redirect to AppLayout

Modified files:
- frontend/src/layouts/AppLayout.vue — admin link, login/logout nav state, redirect watcher for mid-session token loss
- frontend/src/locales/en.json — add nav.admin and auth.nav.* keys"
```

---

## Self-Review

**Spec coverage:**
- Decision 1 (scope: admin UI + password complexity) - Tasks 2, 16, 17.
- Decision 2 (localStorage) - Task 3.
- Decision 3 (eager guard redirect) - Task 15.
- Decision 4 (`GET /auth/me`, not JWT decode; settled state before first navigation) - Task 6 (`fetchMe`/`restoreSession`), Task 7 (`main.ts` sequencing, documented as a simpler equivalent to the spec's `ready`-promise sketch in Global Constraints).
- Decision 5 (client attaches token, clears on 401, never navigates; single watcher owns navigation) - Task 4 (attach/clear), Task 18 (watcher).
- Decision 6 (server-enforced, client-mirrored password complexity) - Task 2 (server), Task 5 (client mirror), Task 11 (live feedback UI).
- File structure list - every file the spec named is covered: `register.dto.ts`/`.spec.ts` (Task 2), `stores/auth.ts` (Task 6), `stores/admin.ts` (Task 16), `api/client.ts` (Task 4), `router/index.ts` (Task 15), `main.ts` (Task 7), `LoginView`/`RegisterView`/`VerifyEmailView`/`AdminUsersView` (Tasks 12, 13, 14, 15+17), `LoginForm`/`RegisterForm`/`ResendVerificationForm`/`ConfirmDialog` (Tasks 10, 11, 9, 8), `password-strength.ts` (Task 5), `AppLayout.vue` (Task 18), `locales/en.json` (throughout).
- Data flow section (register/verify/login/resend/admin) - each flow's exact error-branch behavior is implemented in Tasks 6/9/10/11/14/16/17 and asserted in their specs.
- Testing strategy section - every named spec file exists in this plan (`stores/auth.spec.ts`, `stores/admin.spec.ts`, `utils/password-strength.spec.ts`, `LoginForm/RegisterForm/ResendVerificationForm/ConfirmDialog.spec.ts`, `router/index.spec.ts`, backend `register.dto.spec.ts`).
- Backlog update - Task 1.

**Placeholder scan:** no "TBD"/"TODO" markers; the one deliberate forward reference (`AdminUsersView.vue` stub in Task 15, completed in Task 17) is called out explicitly as a real, working component rather than a placeholder, and its full code is given at each step.

**Type consistency:** `PublicUser` (Task 6) is imported by `AdminUserSummary` (Task 16, via `UserRole`) and by the fixtures (Task 6, 16); `LoginErrorKind`/`RegisterErrorKind` string literals match exactly between `stores/auth.ts` and the i18n key paths used in `LoginForm.vue`/`RegisterForm.vue`; `getJson`/`patchJson`/`deleteJson` signatures introduced in Task 4 match their call sites in Tasks 6, 16 exactly (`getJson<T>(path)`, `patchJson<T>(path, body)`, `deleteJson(path): Promise<void>`).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-09-feat-023-frontend-auth-admin-ui.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
