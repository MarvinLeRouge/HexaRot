[🇫🇷 Version française](frontend_architecture.fr.md) | 🇬🇧 English version

---

# Frontend architecture

The frontend is a Vue 3 single-page application using the Composition API, Pinia
for state, Vue Router for navigation, and vue-i18n for translations.

## Structure

```
frontend/src/
├── views/            # EncodeView, DecodeView, KeyView
├── components/        # Shared, view-specific UI components
├── layouts/            # AppLayout (page shell)
├── stores/             # Pinia stores: encode, decode, key
├── api/                # Backend API client
├── constants/           # Shared constants (e.g. reading-orders.ts)
├── locales/             # vue-i18n translation files (en.json)
├── router/               # Vue Router configuration
└── utils/                # Shared utility functions
```

## Routing

Three top-level routes, defined in `router/`, each mapped to a view:

| Path | View | Purpose |
|---|---|---|
| `/` | redirects to `/encode` | |
| `/encode` | `EncodeView` | Text → cryptogram |
| `/decode` | `DecodeView` | Cryptogram → text |
| `/key` | `KeyView` | Generate or parse a key |

## Views and components

Each view composes a params form, a submit action against its store, and a
result panel:

- `EncodeView` uses `EncodeParamsForm`, `RotationSequencePicker`, and
  `EncodeResultPanel`.
- `DecodeView` uses `DecodeUploadArea` and `DecodeParamsForm`.
- `KeyView` uses `KeyGeneratorForm` and `KeyParserForm`.

`LoadingSpinner` is shared across all three for in-flight requests.
`AppLayout` provides the common page shell (navigation, container width).

## State management

Each view has a dedicated Pinia store (`stores/encode.ts`, `stores/decode.ts`,
`stores/key.ts`) holding form parameters, the last successful result, loading
state, and error state. Stores are responsible for tracking whether a displayed
result is stale relative to the current form parameters, rather than discarding
the previous result outright; see [ADR 0005](../adr/0005-stale-result-marked-not-destroyed.md).

## API client

`api/client.ts` centralises calls to the backend's `/api` endpoints (see
[docs/api/api_endpoints.md](../api/api_endpoints.md)). Requests are proxied
through Vite's dev server to the backend container in local development (see
[docs/operations.md](../operations.md)).

## Internationalization

`vue-i18n` is wired in, with `locales/en.json` as the only implemented locale in
V1. A French locale is planned for V2; see [docs/roadmap.md](../roadmap.md).

## Adding a view

1. Create the view component under `views/`, and a matching Pinia store under
   `stores/` if it needs its own state.
2. Register the route in `router/`.
3. Add any new UI text to `locales/en.json`.
4. Add a `.spec.ts` test file alongside the view, following the existing views'
   test structure.
