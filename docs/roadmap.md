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

- ⬜ French interface (i18n)
- ⬜ Animated decoding mode
- ⬜ Spiral reading order
- ⬜ Correlation score
- ⬜ User authentication

---

`BACKLOG.md` (gitignored, local to the maintainer) is the single source of truth
for planned work at the item level; this roadmap tracks the higher-level phases.
