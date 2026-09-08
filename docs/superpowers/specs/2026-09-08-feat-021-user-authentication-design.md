# FEAT-021 User Authentication Design Spec

**Status:** Approved by the user (2026-09-08), ready for writing-plans.

**Backlog item:** FEAT-021, `status: ready`, `depends-on: CHORE-004` (done), `domain: api`, `complexity: XL`. Scope expanded during this design pass beyond the backlog's current text (see "Backlog update" below); the backlog entry will be updated to match this spec before implementation starts.

## Context

`backend/prisma/schema.prisma` currently has no `User` concept at all - only reference data (`Alphabet`, `Symbol`, `ColorCase`). There is no auth module, no JWT handling, no password hashing dependency. `encode`/`decode`/`key` are public utility endpoints with no ownership semantics.

`CHORE-008` (security audit) is blocked on this item: its acceptance criteria cover JWT/verification-token handling and rate limiting on registration/login/resend-verification, none of which exist yet.

Two sibling NestJS/Fastify + Prisma projects already implement a similar flow and are used as precedent throughout this spec:
- **HiveMind** (`apps/api`): `mailer.service.ts` (interface + Nodemailer impl + Noop test impl), `auth.service.ts` (bcrypt, hashed verification tokens, JWT), `prisma/seed.ts` (env-driven admin seed).
- **GeoChallenge-Tracker**: `fix/verify-email-code-leak-via-get` (merged) - the verify-email endpoint must be POST with the token in the body, never GET with the token as a query param, to avoid it leaking into access logs / Referer headers.

## Decision 1: scope goes beyond the current backlog text

The original `FEAT-021` acceptance criteria only cover register/verify/resend/login + JWT issuance/validation, with no mention of roles or account moderation. During brainstorming the user defined a broader model for HexaRot:

- Every route except the public auth endpoints requires a valid token (including the existing `encode`/`decode`/`key` endpoints, which become protected as a side effect of this item).
- A single seeded admin account exists (`role: ADMIN`), created via env-driven seed, no promotion endpoint.
- The admin can invalidate (`active: false`, reversible) or permanently delete any user account.

This is a deliberate product decision, not a security bug fix: `encode`/`decode`/`key` had no vulnerability today (no per-user data exists to leak), gating them is a new capability, not a correction.

## Decision 2: guard-by-default via a global `APP_GUARD`, not per-route guards

A `JwtAuthGuard` is registered once as `APP_GUARD` so every route is protected unless explicitly opted out via a `@Public()` decorator (checked through `Reflector`). This is deliberately deny-by-default: a future route added without thinking about auth is protected automatically, rather than silently public until someone remembers to add a guard.

Only four routes get `@Public()`: `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`.

A second guard, `RolesGuard`, reads `req.user.role` (set by `JwtAuthGuard`) and enforces `@Roles('ADMIN')` on the admin controller.

## Decision 3: custom Guard + `@nestjs/jwt`, not Passport

`@nestjs/passport` + `passport-jwt` is the more "canonical" NestJS auth stack, but it adds a Strategy class and module wiring for something a ~30-line `CanActivate` implementation covers directly. The backlog's own `learning` tags say "NestJS Guards", not Passport. `@nestjs/jwt` alone (sign/verify) is enough.

## Decision 4: single access token, no refresh token

The original backlog left "token lifetime and refresh strategy" open. No acceptance criterion mentions refresh tokens. Given the item is already XL, a refresh-token pair (extra table, rotation logic, `/auth/refresh`, `/auth/logout`) is deferred as a separate future item if session longevity becomes a real problem. `JWT_EXPIRES_IN` (already stubbed as a commented-out placeholder in `.env.example`, `3600` seconds) stays configurable.

## Decision 5: verify-email is POST-only from the start

Per GeoChallenge-Tracker's `fix/verify-email-code-leak-via-get`, a GET endpoint with the token as a query parameter ends up in access logs and Referer headers. HexaRot has no legacy GET route to keep for compatibility, so `POST /auth/verify-email` with `{ token }` in the body is the only version built.

## Decision 6: password hashing via `bcryptjs`, not native `bcrypt`

`bcryptjs` is pure JS, no native compilation step, and is what HiveMind already uses. Native `bcrypt` would work too (the Docker image has `build-essential`), but `bcryptjs` avoids any risk of native-module friction in CI's `ubuntu-latest` runner and keeps cross-project consistency.

## Decision 7: rate limiting via `@nestjs/throttler`

Official NestJS package, integrates as a guard with per-route `@Throttle()` overrides. Applied globally with a permissive default, tightened specifically on `register`, `login`, `resend-verification` per the backlog's acceptance criteria.

## Architecture

### Data model (`prisma/schema.prisma` additions)

```prisma
enum Role {
  USER
  ADMIN
}

model User {
  id                 String               @id @default(uuid())
  email              String               @unique
  passwordHash       String
  role               Role                 @default(USER)
  emailVerified      Boolean              @default(false)
  active             Boolean              @default(true)
  createdAt          DateTime             @default(now())
  verificationTokens VerificationToken[]
}

model VerificationToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

`User.id` is a UUID (unlike the auto-increment `Alphabet`/`Symbol`/`ColorCase` ids) to avoid exposing a guessable sequential identifier or leaking total account count. `VerificationToken.tokenHash` stores a SHA-256 of the raw token, never the plaintext. A resend deletes the user's existing token(s) before creating a new one - one valid token per user at a time.

### Module layout (mirrors existing `backend/src/<domain>/` structure)

- `src/auth/` - `AuthModule`, `AuthController` (register/verify-email/resend-verification/login/me), `AuthService`, DTOs (`class-validator`, mirroring `api/dto/`), `JwtAuthGuard`, `RolesGuard`, `@Public()` and `@Roles()` decorators.
- `src/admin/` - `AdminModule`, `AdminUsersController` (list/invalidate-toggle/delete), guarded by `@Roles('ADMIN')`.
- `src/mailer/` - `MailerService` interface, `NodemailerMailerService`, `NoopMailerService` (test double exposing the last-sent token, same shape as HiveMind's).

### Endpoints

**Public:**
- `POST /auth/register` `{email, password}` → 201, creates the user (`emailVerified: false`, `active: true`, `role: USER`), sends the verification email, returns the public profile (no token - must verify then log in).
- `POST /auth/verify-email` `{token}` → verifies the hash, marks `emailVerified: true`, deletes the token. 400 on unknown/expired/already-used token.
- `POST /auth/resend-verification` `{email}` → 202, identical response whether or not the account exists (anti-enumeration, per the backlog's own acceptance criteria).
- `POST /auth/login` `{email, password}` → checks password (bcryptjs), then `active` (403 if disabled), then `emailVerified` (401, message distinguishable from "wrong password"), then issues the JWT.

**Protected (JWT required):**
- `GET /auth/me` → current user's profile. Doubles as the guard's proof-of-life test.
- `encode` / `decode` / `key` (existing controllers, unchanged code) → protected purely as a side effect of the global guard.

**Admin only (`@Roles('ADMIN')`):**
- `GET /admin/users` → paginated list (id, email, role, active, emailVerified, createdAt - never `passwordHash`).
- `PATCH /admin/users/:id` `{active: boolean}` → toggles activation (single endpoint covers both invalidate and reactivate).
- `DELETE /admin/users/:id` → permanent delete, cascades to `VerificationToken`.
- Self-protection: an admin cannot deactivate or delete their own account (400) - there is exactly one admin and no promotion path, so self-lockout would have no recovery.

### Config (`.env.example` additions)

```
# JWT
JWT_SECRET=change_me
JWT_EXPIRES_IN=3600

# SMTP (Brevo relay)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
FRONTEND_BASE_URL=http://localhost:5173

# Admin seed
SEED_ADMIN_EMAIL=admin@hexarot.local
SEED_ADMIN_PASSWORD=change_me_admin
```

Variable names for SMTP match what the backlog already specifies (`SMTP_HOST/PORT/USER/PASS/FROM`, `FRONTEND_BASE_URL`), which happens to match HiveMind's convention rather than GeoChallenge-Tracker's (`SMTP_USERNAME`/`SMTP_PASSWORD`/`MAIL_FROM`).

### Operations required from the user (not executable by the assistant)

- **SMTP credentials**: Brevo SMTP login is account-wide, not per-project. If the existing Brevo account (already used by GeoChallenge-Tracker/HiveMind) can be reused, only `SMTP_FROM` needs to be HexaRot-specific. The user needs to add `SMTP_HOST/PORT/USER/PASS/FROM` and `FRONTEND_BASE_URL` to `backend/.env` when this part is implemented, and later to production config once/if HexaRot is deployed with real mail sending. This will be asked for again precisely when the mailer wiring is reached, not upfront.
- **Admin seed password**: `SEED_ADMIN_PASSWORD` must be set to a real value before any non-local deployment; the `change_me_admin` default is dev/CI only.

### Seed (`prisma/seed.ts`)

Single idempotent upsert on `SEED_ADMIN_EMAIL`, `role: ADMIN`, `emailVerified: true`, `active: true`. Unlike HiveMind (which seeds a fixed test admin *and* a separate custom admin), HexaRot seeds exactly one admin account, matching the "single admin" requirement.

## Testing strategy

No coverage threshold currently applies to new modules (`package.json`'s `coverageThreshold` only lists `cipher`/`key`/`rotation`/`reading-order`), but coverage should match that bar in practice:

- `AuthService` unit tests: duplicate email on register, bcrypt hashing, verify-email (valid/expired/already-used token), resend (identical response for existing/non-existing email), login (wrong password, unverified account, deactivated account, success path).
- `JwtAuthGuard` / `RolesGuard` unit tests: missing/invalid/expired token, `@Public()` bypass, insufficient role.
- Admin endpoints: list/invalidate/delete, self-deactivation and self-delete guard.
- Integration tests against the real Postgres test database (existing CI pattern, `postgres:16` service already provisioned) covering at least register → verify → login → access a protected route end to end.

## Explicitly out of scope for this plan

- Refresh tokens / `/auth/refresh` / `/auth/logout` (see Decision 4).
- Any frontend work (login form, verify-email page, admin UI) - `FEAT-021`'s `domain` is `api` only.
- Admin promotion/creation endpoints - the single admin account is seed-only.
- Password reset / "forgot password" flow - not mentioned in the backlog's acceptance criteria.
- Protecting `encode`/`decode`/`key` with anything beyond "any authenticated user" (e.g. no per-user quotas or per-user data ownership introduced here).

## Backlog update

Before implementation starts, `BACKLOG.md`'s `FEAT-021` entry gets its acceptance criteria extended to cover: global route protection by default, the `Role` enum and single seeded admin, and the invalidate/delete admin endpoints - so the backlog stays the source of truth for what shipped.
