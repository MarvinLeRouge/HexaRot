# POST /decode Design Spec

**Status:** Approved by the user (2026-08-17), ready for writing-plans.

**Backlog item:** FEAT-012, `status: ready`, `depends-on: FEAT-011` (done), `domain: api`, `complexity: M`.

## Context

`POST /decode` is the last remaining V1 backend API endpoint. It accepts a cryptogram
(PNG or SVG) plus the key used to encode it, inverts the cipher pipeline, and returns
the decoded text. Two things make this architecturally non-trivial rather than a thin
wrapper, both resolved in this design after discussion with the user:

1. **No image-parsing code exists yet.** `PngRenderer`/`SvgRenderer` (FEAT-009/010) only
   go one direction (`ColorGrid` -> image). Nothing reads an image back into a `ColorGrid`.
2. **There is no metadata header** (deliberate security decision, FEAT-009's planning -
   see `docs/tests/renderer.md`, "Design note: no visual header row"). Without one,
   nothing in the cryptogram itself says how long the real message is or where random
   padding begins.

`RotationEngine.decode()` already exists (FEAT-007) and correctly inverts
`RotationEngine.encode()` - this design does not need to touch rotation logic at all,
only build the two missing pieces (image parsing, grid-to-text decoding) around it.

## Decision 1: `size` becomes a required request field

The original `BACKLOG.md` request shape (`cryptogram`, `format`, `key`) has no `size`
field. Without it, a PNG parser cannot reliably determine `casePixels` (8/16/32) from
pixel dimensions alone - multiple candidate values can evenly divide the same width and
height, and picking the wrong one silently reconstructs the wrong number of cases.

**Decided:** the request body gets a required `size: 'small' | 'medium' | 'large'` field,
mirroring what the encode endpoint already accepts. The caller (ultimately the frontend,
which already knows what size it requested at encode time) supplies it explicitly - no
inference, no ambiguity. This applies uniformly to both `format` values, even though SVG
is technically self-describing (each `<rect>`'s own `width` attribute already states its
case size) - one consistent request shape for both formats, no format-conditional
required fields.

## Decision 2: no automatic message/padding boundary detection

Two alternatives were discussed:
- Stop decoding at the first symbol block that doesn't match any known character
  (padding blocks are typically, but not always, unrecognizable - a coincidental match
  is possible but rare).
- Decode every block in the grid unconditionally, real message and random padding
  alike, marking unrecognized blocks with a placeholder character, and return
  everything with no attempt to guess where the real content ends.

**Decided: the second option.** `POST /decode` returns the full decoded grid content -
the real message characters (which are always exactly recognizable, by construction)
followed by whatever the padding region happens to decode to (mostly `?` placeholders
for unrecognized blocks, occasionally a real character by coincidence). No heuristic
judgment call is made about where the message "really" ends; that is left entirely to
whoever reads the response. This is the more honest design given there is genuinely no
reliable signal to make that call correctly 100% of the time, and it avoids silently
guessing wrong in either direction (truncating real content, or appending garbage) in a
way the caller cannot detect or correct for.

**Consequence for the round-trip acceptance criterion.** `BACKLOG.md`'s "Round-trip
test: encode a message, decode the output, verify original message is recovered" cannot
mean strict equality anymore, since the decoded output now includes trailing
padding-derived content. It is reinterpreted as: `decoded.startsWith(originalMessage)`.
This reinterpretation must be reflected in the implementation plan's test code, not
silently narrowed back to exact equality by an implementer who didn't see this
discussion.

**Placeholder character:** `?` (plain ASCII) for any block that does not match a known
character in the alphabet's symbol set.

## Architecture

Two new pieces, both pure/synchronous and independently testable, live alongside their
existing "forward direction" siblings for domain symmetry:

- **`renderer/png-parser.ts`, `renderer/svg-parser.ts`** - the inverse of
  `PngRenderer`/`SvgRenderer`. Both take a decoded cryptogram plus the case-size's
  `casePixels` value and return a `ColorGrid`. `png-parser.ts` uses Sharp's raw pixel
  API (no interpolation to reverse - PNG rendering is exact solid blocks, so sampling
  any single pixel within a case, e.g. its top-left corner, is sufficient - every pixel
  in that case is identical by construction, and the sampled RGB only ever needs an
  EXACT match against the fixed 9-colour palette, not fuzzy/nearest-colour matching)
  and adds a new `rgbToColorName` reverse lookup to
  `renderer/palette.ts` (the inverse of the existing `colorNameToRgb`). `svg-parser.ts`
  uses `fast-xml-parser` to read every `<rect>`'s `x`/`y`/`width`/`fill` and reconstruct
  the grid directly from those coordinates - **`fast-xml-parser` moves from
  `devDependencies` to `dependencies`** as a result, since production code now needs it
  at runtime, not just tests.
- **`cipher/decode-grid.ts`** - the inverse of `cipher/build-grid.ts`. Builds a reverse
  lookup (character -> `ColorGrid`, inverted to `ColorGrid` -> character) from
  `alphabet.getSupportedChars()`/`.getBlock()`, then reads the input grid in the same
  row-major, `symbolWidth`x`symbolHeight`-block order `buildGrid` used to place
  characters, emitting either the matched character or `?` for each block. Returns a
  plain string - the full decoded content, unconditionally, no truncation logic.

Orchestration, matching the existing `EncodeService`/`KeyService` pattern:

- **`api/decode.service.ts`** (`DecodeService`): decode the key (`KeyCodec.decode`,
  already hardened by FEAT-013, reuses the existing `try/catch` -> `BadRequestException`
  pattern), decode the cryptogram to a `ColorGrid` via the appropriate parser based on
  `format`, validate the resulting grid's dimensions are consistent with the decoded
  key's `pivotBlockSize` (both dimensions must be exact multiples of it, exactly the
  invariant `buildGrid`/`RotationEngine` already guarantee at encode time - a mismatch
  here means a corrupted cryptogram or a key/size that doesn't actually match the
  supplied image), invert the rotation via `RotationEngine.decode()`, then call
  `decodeGrid()` to produce the final string.
- **`api/decode.controller.ts`** (`DecodeController`): `@Controller('decode')`,
  `@Post() @HttpCode(200)` (same NestJS-defaults-to-201 gotcha as every other POST
  route in this API so far).
- **`api/dto/decode-request.dto.ts`** (`DecodeRequestDto`): `cryptogram` (required
  string), `format` (required, `'png'|'svg'`), `key` (required string), `size`
  (required, `'small'|'medium'|'large'`).

`ApiModule` registers `DecodeController`/`DecodeService` alongside the existing
`Encode*`/`Key*` pairs - no changes to its `imports` array (it already has
`AlphabetModule`, `RotationModule`, `RendererModule`; nothing new is needed there,
`DecodeService` needs the same `HexahueAlphabet` + `RotationEngine` dependencies
`EncodeService` already has, no new module import required).

## Error handling (all 400 with a descriptive message, matching the established pattern)

- Malformed key -> existing `KeyCodec.decode()` catch/rethrow pattern.
- `format` not `'png'`/`'svg'` -> DTO validation (`@IsIn`).
- `size` not one of the three valid values -> DTO validation (`@IsIn`).
- Missing required fields -> existing global `ValidationPipe` (`whitelist`,
  `forbidNonWhitelisted`).
- `cryptogram` not valid base64 (PNG format) -> caught in `PngParser`, rethrown as
  `BadRequestException`.
- `cryptogram` not valid/well-formed SVG (SVG format) -> caught in `SvgParser`,
  rethrown as `BadRequestException`.
- Decoded grid's dimensions inconsistent with the decoded key's `pivotBlockSize` (not
  an exact multiple in either axis) -> `BadRequestException` from `DecodeService`,
  distinct from the two parser-level "structurally invalid image" cases above - this
  one means the image parsed fine but doesn't match the key/size combination given.

## Testing strategy

Same test-strategy decision already established and reused across FEAT-011/012/013:
mocked/in-memory `MockAlphabet` (no real database), full HTTP-level e2e suite via
`Test.createTestingModule` + `overrideProvider(HexahueAlphabet)` + the same Prisma
`jest.mock`, following `encode.e2e-spec.ts`/`key.e2e-spec.ts`'s already-established
pattern exactly.

- Unit tests for `rgbToColorName` (palette.ts addition), `png-parser.ts`,
  `svg-parser.ts`, `decode-grid.ts` (including its `?` placeholder behavior for
  unrecognized blocks) - each independently, with small hand-constructed fixtures.
- `DecodeService` unit tests covering the orchestration and every error-mapping case
  above.
- `decode.e2e-spec.ts` covering the full HTTP contract, matching
  `docs/tests/api.md` section 2's bullets (to be read and cross-checked against this
  design during planning - this design was produced without re-reading that section in
  full, the planning step must reconcile the two before finalizing test lists).
- **The round-trip test is the most important test in this feature**: run the real
  encode pipeline (or call `EncodeService` directly) to produce a genuine cryptogram,
  feed it through `DecodeService`, and assert `decodedMessage.startsWith(originalMessage)`
  - not strict equality, per Decision 2 above.

## Open items carried forward, explicitly not solved by this design

- Message-boundary detection (distinguishing real content from padding-derived noise
  in the decoded output) remains genuinely unsolved by design, not by oversight - see
  Decision 2. A future "evolution" (per `docs/tests/renderer.md`'s own wording) could
  revisit this with a properly key-dependent header encoding or a different heuristic;
  this design deliberately does not attempt one.
- `KeyCodec.encode()` still lacks a symmetric `pivotBlockSize` range guard (mirroring
  the one already added to `decode()` in FEAT-013) - flagged by FEAT-013's final review
  as a Minor, not fixed there. Not this feature's concern either, noted here only so it
  isn't rediscovered as a surprise.
