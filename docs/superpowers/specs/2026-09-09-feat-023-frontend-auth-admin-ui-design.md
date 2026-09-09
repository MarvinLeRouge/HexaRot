# FEAT-023 Frontend Auth & Admin UI Design Spec

**Status:** Approved by user (2026-09-09), ready for writing-plans.

**Backlog item:** FEAT-023 (new), `depends-on: FEAT-021` (done). Backlog entry to be
added as part of implementation start (see "Backlog update" below).

## Context

FEAT-021 shipped backend JWT authentication and gated every API route except the four
auth endpoints and `GET /` behind a valid JWT, including `encode`/`decode`/`key`. The
frontend (`frontend/src/`) has zero auth integration: `api/client.ts` never attaches an
`Authorization` header, there is no login/register view, and the router
(`frontend/src/router/index.ts`) only defines `/encode`, `/decode`, `/key`. As a result
the deployed app is currently unusable by real visitors - every core feature returns 401.

This was discovered while verifying two unrelated production incidents (a Prisma
generated-client import bug and a Traefik prefix-stripping bug), both already fixed and
deployed. This spec covers the frontend work needed to close the gap FEAT-021 opened,
plus an admin UI for the account-moderation endpoints FEAT-021 also shipped
(`GET/PATCH/DELETE /admin/users`) but that no frontend has ever consumed.

## Decision 1: scope includes admin UI and password complexity enforcement

Original ask was "frontend auth to match FEAT-021's gating". During brainstorming, scope
was confirmed to include:
- A full auth flow: login, register, email verification landing page, resend
  verification.
- A basic admin UI (list/deactivate/reactivate/delete users) - no role management, no
  promotion flow (FEAT-021 already fixed exactly one seeded admin, no promotion
  endpoint).
- Backend-enforced password complexity beyond the existing length check (12-72 chars):
  lowercase, uppercase, digit, special character. This is a small backend change
  (`RegisterDto`) bundled into this item since it only matters once a register UI exists
  to exercise it.

## Decision 2: token storage in `localStorage`

No refresh token exists (FEAT-021 Decision 4: single access token, `JWT_EXPIRES_IN`
seconds, default 3600). Options considered: `localStorage` (persists across reloads/tabs,
readable by any XSS payload), `sessionStorage` (same exposure, tab-scoped), in-memory only
(safest against XSS, but forces re-login on every page reload).

`localStorage` was chosen for UX: HexaRot is a public tool without sensitive data behind
the login wall beyond usage attribution, and forcing re-login on every reload is an
unacceptable UX cost for that threat level. Flagged for CHORE-008 (security audit) to
revisit if the threat model changes.

## Decision 3: route guard redirects eagerly, not inline gating

Visiting a protected route (`/encode`, `/decode`, `/key`, `/admin/users`) without a valid
session redirects immediately to `/login?redirect=<path>`, rather than rendering the page
and blocking only the submit action. This matches the backend's deny-by-default posture
(FEAT-021 Decision 2) instead of half-gating the UI while the API rejects everything
anyway.

## Decision 4: user profile fetched via `GET /auth/me`, not decoded from the JWT

The JWT payload only carries `{ sub, role }` (see `backend/src/auth/jwt-auth.guard.ts`'s
`JwtPayload`) - no email. The admin-nav-link check needs `role`, which the payload has,
but showing "logged in as x@y.com" or populating the admin table needs the full
`PublicUser` shape. Rather than depend on the JWT's internal shape from the frontend
(coupling to a backend implementation detail, and needing a `jwt-decode` dependency), the
auth store calls `GET /auth/me` right after a successful login and stores the returned
`PublicUser` (`id`, `email`, `role`, `emailVerified`, `active`, `createdAt`).

On app boot, if a token exists in `localStorage`, the store restores it and calls
`GET /auth/me` again to both populate `user` and validate the token is still accepted
(catches server-side deactivation or expiry since the last visit). `main.ts` awaits this
restore before mounting the router (`router.isReady()` pattern combined with an
`authStore.ready` promise) so the first navigation's guard sees a settled auth state
instead of racing it.

## Decision 5: `api/client.ts` attaches the token but does not redirect

`postJson` (and any future `getJson`) reads `accessToken` from the auth store and sets
`Authorization: Bearer <token>` when present. On a `401` response, it clears the session
(store + `localStorage`) but does not perform navigation itself - that stays a single
reactive watcher in `AppLayout.vue` (`watch(() => authStore.accessToken, ...)`), which
redirects to `/login?redirect=<currentPath>` whenever the token transitions from set to
`null` while on a protected route. This covers both the router-guard case (rejected before
a protected view mounts) and the mid-session case (token expires while already on
`/encode`, `/decode`, `/key`, or `/admin/users` and a request 401s). Keeps the HTTP client
itself free of router coupling - it only ever touches the store.

## Decision 6: password complexity enforced server-side, mirrored client-side

`RegisterDto.password` gets an added `@Matches` regex requiring at least one lowercase,
one uppercase, one digit, and one special character, alongside the existing
`@MinLength(12)`/`@MaxLength(72)`. This is the authoritative check - `POST /auth/register`
rejects with 400 regardless of what the client sent. The frontend duplicates the same
rule in `utils/password-strength.ts` purely for live, per-criterion feedback while typing;
no dedicated validation endpoint (rejected alternative: would add a network round-trip per
keystroke for a static, stateless rule with no benefit over duplication here).

## File structure

### Backend (small addition to existing FEAT-021 work)

- `backend/src/auth/dto/register.dto.ts` - add `@Matches` password regex.
- `backend/src/auth/dto/register.dto.spec.ts` - add cases per missing criterion
  (no uppercase, no lowercase, no digit, no special character).

### Frontend

- `frontend/src/stores/auth.ts` - new. State: `accessToken`, `user: PublicUser | null`,
  `status`, `ready` (boot-restore promise). Actions: `login`, `register`, `verifyEmail`,
  `resendVerification`, `logout`, `restoreSession`, `fetchMe`.
- `frontend/src/stores/admin.ts` - new. State: `users: AdminUserSummary[]`, `status`,
  `errorMessage`. Actions: `fetchUsers`, `setActive(id, active)`, `removeUser(id)`.
- `frontend/src/api/client.ts` - modified: attach `Authorization` header, handle `401`
  by clearing the auth store.
- `frontend/src/router/index.ts` - modified: add `/login`, `/register`, `/verify-email`,
  `/admin/users` routes; add `beforeEach` guard (awaits `authStore.ready`, checks
  `accessToken` and `role`).
- `frontend/src/main.ts` - modified: await `authStore.restoreSession()` before router
  navigation resolves.
- `frontend/src/views/LoginView.vue`, `RegisterView.vue`, `VerifyEmailView.vue`,
  `AdminUsersView.vue` - new, follow the existing `EncodeView.vue` pattern (view owns
  layout/status wiring, delegates form UI to a component).
- `frontend/src/components/LoginForm.vue`, `RegisterForm.vue`,
  `ResendVerificationForm.vue`, `ConfirmDialog.vue` - new.
- `frontend/src/utils/password-strength.ts` - new, pure function returning unmet
  criteria for a given password string.
- `frontend/src/layouts/AppLayout.vue` - modified: login/logout state in nav, "Admin"
  link visible only when `authStore.user?.role === 'ADMIN'`.
- `frontend/src/locales/en.json` - modified: new `auth.*` and `admin.*` keys.

## Data flow

**Register:** `RegisterForm` submits `{ email, password }` → `POST /auth/register` → on
201, `RegisterView` swaps the form for a "check your email" panel. No auto-login (backend
blocks login until verified anyway). `409` (duplicate email) surfaces inline on the email
field.

**Verify email:** `VerifyEmailView` reads `?token=` from the route query on mount, calls
`POST /auth/verify-email` automatically (no user action required). Success shows a link to
`/login`; failure (400: unknown/expired/already-used token) shows the error plus an
embedded `ResendVerificationForm`.

**Login:** `LoginForm` submits `{ email, password }` → `authStore.login()` →
`POST /auth/login`. On success, store the token, call `GET /auth/me`, then redirect to the
`redirect` query param or `/encode`. On error, branch on status/message:
- `401` + message `"Email address not verified"` → show `ResendVerificationForm` inline.
- `403` (disabled account) → show a distinct "account disabled" message, no resend.
- Anything else `401` → generic "invalid credentials" message (no account enumeration).

**Resend verification:** `ResendVerificationForm` submits `{ email }` →
`POST /auth/resend-verification` → always shows the same generic success message
(mirrors the backend's anti-enumeration response).

**Admin:** `AdminUsersView` calls `adminStore.fetchUsers()` on mount → renders a table
(email, role, verified, active, created). Toggle-active and Delete are inline row actions;
Delete opens `ConfirmDialog` before calling `removeUser`. A self-action error from the
backend (self-deactivation/self-deletion block) is displayed as returned, no client-side
duplication of that rule.

## Testing strategy

Mirrors existing colocated `.spec.ts` pattern (Vitest):
- `stores/auth.spec.ts` - login/register/verifyEmail/resendVerification/logout,
  localStorage persistence, `restoreSession` (valid token, expired/invalid token, no
  token), error-branch mapping (unverified vs disabled vs invalid credentials).
- `stores/admin.spec.ts` - fetch/setActive/removeUser success and error paths.
- `utils/password-strength.spec.ts` - one case per criterion, plus a fully valid password.
- `components/LoginForm.spec.ts`, `RegisterForm.spec.ts`, `ResendVerificationForm.spec.ts`,
  `ConfirmDialog.spec.ts` - render, submit, error display.
- `router/index.spec.ts` (new file, no router tests exist yet) - unauthenticated redirect
  to `/login?redirect=`, non-admin redirect away from `/admin/users`, post-login redirect
  to the original target.
- Backend: extend `backend/src/auth/dto/register.dto.spec.ts` with the four new
  complexity cases.

## Backlog update

A new `FEAT-023` entry will be added to `BACKLOG.md` at implementation start, covering:
frontend login/register/verify-email/resend-verification flow, route guarding on
encode/decode/key, admin user-management UI, and backend password-complexity enforcement.
`depends-on: FEAT-021` (done).
