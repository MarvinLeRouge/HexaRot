[🇫🇷 Version française](roadmap.fr.md) | 🇬🇧 English version

---

# Roadmap

## V1

- ✅ Infra (NestJS, Vue.js, Docker Compose, Prisma)
- ✅ CI (GitHub Actions, tests pipeline, backlog sync)
- ✅ Alphabet (VisualAlphabet interface + Hexahue implementation)
- ✅ Cipher (pre-processing, grid construction, no metadata header by design, a deliberate anti-leakage choice)
- ✅ Rotation engine
- ✅ Key codec (base36 encode / decode / validate)
- ✅ Reading order strategies (4 directions + alternate)
- ✅ Renderers (PNG + SVG)
- ✅ API endpoints (encode, decode, key)
- ✅ Frontend (encode, decode, key views all done, UI/UX polish pass done)
- ✅ Tests & coverage (backend + frontend unit/e2e suites, Codecov reporting, ≥85% global bar confirmed)

## V2

- ✅ French interface (i18n)
- ⬜ Animated decoding mode
- ⬜ Spiral reading order
- ✅ Correlation score (API endpoint)
- ✅ User authentication
- ✅ Help page (concept and settings, English and French)
- ✅ Error tracking (Sentry, backend and frontend)
- ✅ Error tracking relay, so ad-blockers cannot drop frontend errors
- ✅ Health check endpoint, wired to the production container healthcheck
- ✅ Structured JSON logging, with no private data

## Ideas for later (not yet scoped)

- Show the pre-rotation encoding at relevant points (e.g. alongside the
  correlation score) - could make cryptogram effectiveness more tangible,
  but no backlog item yet

## Section 4 - Maintenance

- [x] CI-006 - Run CI on the changelog bot PR so its auto-merge can complete
- [x] FIX-007 - Install dotenv in the production image so `prisma migrate deploy` can load its config
- [x] CHORE-014 - Hold TypeScript 7 and Node types majors in Dependabot
- [x] DOCS-002 - Correct the README and roadmap before the portfolio project sheet
- [x] TEST-006 - Close per-file coverage gaps
- [x] CHORE-015 - Load prod config only from shared/env, drop compose/.env interpolation and the DOMAIN secret
- [x] FIX-008 - Deploy the images tagged with the commit SHA instead of `latest` (`IMAGE_TAG` was never set)
- [x] CHORE-016 - Align the Node runtime on 26 LTS (CI, Docker images, engines, frontend @types/node, docs)
- [x] FIX-009 - Patch the effect ReDoS advisory (high, pinned by Prisma 7 @prisma/config)
- [x] CI-007 - Pin every GitHub Action to its current major by commit SHA, changelog workflow on Node 26, align the Dependabot config (single actions group)
- [x] CI-008 - Rename the deploy workflow to build-push-deploy.yml, two explicit jobs (Build & push, Deploy), no functional change
- [x] CI-009 - Scan staged changes for secrets with gitleaks in the pre-commit hook

---

`BACKLOG.md` (gitignored, local to the maintainer) is the single source of truth
for planned work at the item level; this roadmap tracks the higher-level phases.
