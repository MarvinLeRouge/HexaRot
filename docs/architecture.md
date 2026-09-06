[🇫🇷 Version française](architecture.fr.md) | 🇬🇧 English version

---

# Architecture - HexaRot

> Public technical reference. See [backend architecture](architecture/backend_architecture.md) and [frontend architecture](architecture/frontend_architecture.md) for implementation details.

## Overview

HexaRot is a two-component web application:

- **Backend** - NestJS 11. Each domain (alphabet, cipher, rotation, key, reading-order, renderer, validation) is a standalone module, wired together to encode text into a Hexahue colour grid, scramble it via block rotations, and decode it back. PostgreSQL via Prisma stores the alphabet/symbol data.
- **Frontend** - Vue 3 (Composition API) SPA with Pinia, Vue Router, and vue-i18n. Three views (Encode, Decode, Key) drive the pipeline over the backend's REST API.

## Project structure

```
hexarot/
├── backend/
│   └── src/
│       ├── alphabet/        # VisualAlphabet interface + HexahueAlphabet
│       ├── cipher/          # Pre-processing, grid construction/decoding
│       ├── rotation/        # Block rotation engine (encode + inverse)
│       ├── key/             # KeyCodec, base36 encode/decode/validate
│       ├── reading-order/   # ReadingOrderStrategy implementations
│       ├── renderer/        # PngRenderer, SvgRenderer
│       ├── validation/      # GCD-based parameter validator
│       └── api/             # NestJS controllers + DTOs
├── frontend/
│   └── src/
│       ├── views/       # EncodeView, DecodeView, KeyView
│       ├── stores/      # Pinia stores (encode, decode, key)
│       ├── components/  # Shared and view-specific UI
│       └── api/         # Backend API client
└── docs/
    ├── architecture/    # backend/frontend architecture
    ├── adr/             # architecture decision records
    ├── api/             # API reference
    └── guides/          # developer/user guides
```

## Further reading

- [Backend architecture](architecture/backend_architecture.md)
- [Frontend architecture](architecture/frontend_architecture.md)
- [API reference](api/api_endpoints.md)
- [Architecture decision records](adr/README.md)
- [Developer guides](guides/)
- [Product context](product-context.md)
- [Operations](operations.md)
- [Design system](design-system.md)
