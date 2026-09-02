[🇫🇷 Version française](frontend_developer_guide.fr.md) | 🇬🇧 English version

---

# Frontend developer guide

This guide covers day-to-day frontend development conventions. See the
[frontend architecture guide](../architecture/frontend_architecture.md) for the
structure overview and [docs/design-system.md](../design-system.md) for the
current visual language.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

See [docs/operations.md](../operations.md) for the Docker Compose alternative,
which routes through Traefik instead of Vite's own dev server directly.

## Adding a view

1. Create the view component under `views/`.
2. Add a Pinia store under `stores/` if the view needs its own state (form
   parameters, result, loading, error, staleness).
3. Register the route in `router/`.
4. Add any new UI text to `locales/en.json`; do not hardcode user-facing strings.
5. Add a `.spec.ts` test file alongside the view.

## Stores and staleness

Each view's store tracks whether the currently displayed result is stale
relative to the form's current parameters, rather than clearing the result
outright when a parameter changes. See
[ADR 0005](../adr/0005-stale-result-marked-not-destroyed.md) for the rationale.
When adding a new store, follow the same pattern: preserve the last successful
result across parameter changes and failed requests, and expose a derived
"stale" flag the view can use to adjust its UI (e.g. disabling re-submission
shortcuts, not disabling recovery actions like copy/download).

## Styling conventions

- Use the CSS custom properties defined in `style.css` (see
  [docs/design-system.md](../design-system.md)) rather than hardcoding colours
  or spacing.
- Respect the `:focus-visible` outline and the 44px minimum touch target for
  interactive elements.

## Testing conventions

```bash
npm run test              # Vitest
npm run test:cov          # coverage report
```

Mirror the test structure to the source structure; a view's spec file sits
alongside the view.

## Internationalization

All user-facing strings go through `vue-i18n` and `locales/en.json`, even though
only English is implemented in V1, so the planned French locale (see
[docs/roadmap.md](../roadmap.md)) can be added without a retrofit pass.
