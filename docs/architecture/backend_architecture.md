[🇫🇷 Version française](backend_architecture.fr.md) | 🇬🇧 English version

---

# Backend architecture

The backend is a NestJS 11 application. Each domain is a standalone module
registered in `app.module.ts`, communicating through typed interfaces rather than
shared mutable state.

## Module map

```
backend/src/
├── alphabet/         # VisualAlphabet interface + HexahueAlphabet implementation
├── cipher/           # Pre-processing, grid construction, decoding
├── rotation/         # Block rotation engine (encode + inverse)
├── key/               # KeyCodec, base36 encode/decode/validate
├── reading-order/     # ReadingOrderStrategy implementations + registry
├── renderer/          # PngRenderer, SvgRenderer, palette, parsers
├── validation/         # GCD-based parameter validator
├── shared/             # Cross-module types and testing utilities
└── api/               # NestJS controllers + DTOs
```

## Module responsibilities

### `alphabet/`

Defines the `VisualAlphabet` abstraction so a different grid-based,
character-by-character alphabet could be plugged in later. `HexahueAlphabetService`
is the only implementation in V1, mapping characters to 2×3 colour-case symbols.

### `cipher/`

The core pipeline glue: `preprocess.ts` uppercases and transliterates the input
message (reporting unhandled characters), `build-grid.ts` lays the message out
into a grid sized to the pivot block, padding it with random colour cases, and
`decode-grid.ts` reverses that process. The cryptogram carries no message-length
metadata by design; see [ADR 0001](../adr/0001-no-message-length-exposure.md).

### `rotation/`

`RotationEngine` and `rotate-block.ts` implement the block rotation itself:
traversing pivot blocks in the given reading order and rotating the colour cases
inside each one. The same engine drives both encoding and its inverse (decoding).

### `key/`

`KeyCodec` encodes and decodes the base36 key format (`HR` prefix): system
version, pivot block size, rotation sequence and direction, and reading order.
Keys are message-independent and reusable.

### `reading-order/`

`ReadingOrderStrategy` is the interface each of the four directions (LR-TB,
RL-TB, TB-LR, BT-LR, each with an optional alternate mode) implements. The
`reading-order.registry.ts` resolves a strategy from its key-encoded identifier.

### `renderer/`

`PngRenderer` (built on Sharp) and `SvgRenderer` turn a coloured grid into an
output image; `palette.ts` maps logical colours to concrete pixel values, and the
PNG/SVG parsers do the reverse for decoding.

### `validation/`

Computes the GCD of the pivot block size and the alphabet's symbol dimensions.
A non-1 result indicates a parameter combination that weakens the cryptogram;
the API surfaces this as a warning rather than a hard failure, and an explicit
override remains possible.

### `api/`

NestJS controllers and DTOs exposing the pipeline over HTTP. See
[docs/api/api_endpoints.md](../api/api_endpoints.md) for the endpoint reference.

## Data flow

**Encode:** `preprocess` → `build-grid` → `RotationEngine` (forward) →
`PngRenderer`/`SvgRenderer`, with `KeyCodec` producing the key from the chosen
parameters.

**Decode:** `KeyCodec` parses the key back into parameters → the PNG/SVG parser
reads the cryptogram into a grid → `RotationEngine` (inverse) → `decode-grid`
reconstructs the message, filling any padding with a `?` placeholder.

## Database

Three Prisma models: `Alphabet` → `Symbol` → `ColorCase`. The Prisma client is
generated to `backend/generated/prisma` in CommonJS format (see
[ADR 0003](../adr/0003-prisma-client-commonjs-output.md)). Seed data for the
Hexahue alphabet lives in `backend/prisma/seed.ts`.
