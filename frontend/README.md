[🇫🇷 Version française](README.fr.md) | 🇬🇧 English version

---

# HexaRot frontend

Vue 3 + TypeScript single-page application for the HexaRot visual cipher: Encode,
Decode, and Key views backed by the [backend API](../backend/README.md).

See the root [README](../README.md) for the project overview and the
[frontend architecture guide](../docs/architecture/frontend_architecture.md) for a
detailed structure walkthrough.

---

## Requirements

- Node.js and npm

Running through Docker Compose from the repository root is the recommended setup; see
the root README's Quick start section.

---

## Setup

```bash
npm install
```

## Development

```bash
npm run dev                 # Vite dev server
npm run build                # type-check (vue-tsc) + production bundle
npm run preview              # preview the production build locally
npm run lint                 # ESLint
```

## Testing

```bash
npm run test                 # Vitest
npm run test:cov            # coverage report
```

---

## Structure

```
src/
├── views/           # EncodeView, DecodeView, KeyView
├── stores/           # Pinia stores (encode, decode, key)
├── components/       # Shared UI components
├── layouts/          # Page layout shells
├── api/              # Backend API client
├── constants/        # Shared constants (reading orders, sizes, etc.)
├── locales/           # vue-i18n translation files
├── router/            # Vue Router configuration
└── utils/             # Shared utility functions
```

## Internationalization

The frontend uses `vue-i18n`. Only the English locale (`locales/en.json`) is
implemented; a French locale is planned for a later release (see
[docs/roadmap.md](../docs/roadmap.md)).
