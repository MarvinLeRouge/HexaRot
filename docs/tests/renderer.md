# HexaRot — Test Spec: Renderer Domain

Covers: FEAT-009 (PngRenderer), FEAT-010 (SvgRenderer).

Renderer tests are split into two layers:
- **Unit tests**: verify structure and logic without producing full images (mocked grid input)
- **Integration tests**: encode a known short message end-to-end and verify output
  properties (dimensions, element count). These may use the filesystem temporarily.

---

## 1. PngRenderer — unit tests (FEAT-009)

```
describe('PngRenderer')
```

**Interface compliance**
- it implements the `Renderer` interface
- it exposes a `render(grid, size)` method returning a Promise\<Buffer\>

**Output validity**
- it returns a Buffer (not null, not undefined)
- it returns a buffer whose first bytes match the PNG magic number (0x89 0x50 0x4E 0x47)

**Dimensions — case size: small (8px per case)**
- it produces an image of width = gridWidthInCases × 8 for a known grid
- it produces an image of height = gridHeightInCases × 8 for a known grid

**Dimensions — case size: medium (16px per case)**
- it produces an image of width = gridWidthInCases × 16
- it produces an image of height = gridHeightInCases × 16

**Dimensions — case size: large (32px per case)**
- it produces an image of width = gridWidthInCases × 32
- it produces an image of height = gridHeightInCases × 32

**Colour accuracy**
- it maps each Hexahue palette colour to the correct RGB value
- it does not introduce colours outside the Hexahue palette for non-padding cells

**Input validation**
- it throws for an empty grid (zero rows)
- it throws for a grid with a zero-length row
- it throws for a grid with inconsistent row lengths (not rectangular)

---

## 2. SvgRenderer — unit tests (FEAT-010)

```
describe('SvgRenderer')
```

**Interface compliance**
- it implements the `Renderer` interface
- it exposes a `render(grid, size)` method returning a string

**Output validity**
- it returns a string starting with '\<svg'
- it returns a well-formed SVG (parseable by a standard XML parser)
- it is self-contained: no external `href`, `src`, or `xlink` references

**viewBox**
- it sets viewBox width = gridWidthInCases × caseSize for size: small
- it sets viewBox height = gridHeightInCases × caseSize for size: small
- it sets correct viewBox for size: medium
- it sets correct viewBox for size: large

**rect elements**
- it produces exactly gridWidthInCases × gridHeightInCases `<rect>` elements
- it sets the `fill` attribute of each `<rect>` to the correct Hexahue hex colour value
- it sets `x`, `y`, `width`, `height` attributes on every `<rect>`

**Colour accuracy**
- it maps each Hexahue palette colour to the correct hex colour string (e.g. '#FF0000')

**Input validation**
- it throws for an empty grid (zero rows)
- it throws for a grid with a zero-length row
- it throws for a grid with inconsistent row lengths (not rectangular)
- it throws for an invalid size value

---

## 3. Integration tests (both renderers)

These tests run the full encoding pipeline on a known short message and verify
output properties. They require the `HexahueAlphabet` backed by the seeded test
database (or a complete in-memory fixture).

```
describe('PngRenderer — integration')
```

- it encodes the message 'AB' with T=5, LR-TB, sequence [0,90,180,270], CW, size medium
  and produces a PNG whose width equals the expected pixel value
- it encodes the message 'AB' with the same params and produces a PNG whose height
  equals the expected pixel value

```
describe('SvgRenderer — integration')
```

- it encodes the message 'AB' with T=5, LR-TB, sequence [0,90,180,270], CW, size medium
  and produces an SVG with the correct viewBox
- it encodes the message 'AB' with the same params and produces an SVG with the
  correct total number of `<rect>` elements (grid cells)

---

## Fixtures

The following shared fixtures must be defined in `__fixtures__/renderer.fixtures.ts`:

- `MOCK_ROTATED_GRID_4x6` — a hardcoded 4-column × 6-row ColorGrid (all cells with
  known palette colours), representing a pre-rotated grid ready for rendering.
- `HEXAHUE_PALETTE_MAP` — map of colour name → expected RGB tuple and hex string,
  covering all colours in the Hexahue palette.
- `EXPECTED_PNG_DIMENSIONS` - map of size option → `{ casePixels }` for computing
  expected output dimensions.

---

## Design note: no visual header row (2026-08-14)

The encoded grid is composed of the pre-processed message plus random padding only.
No metadata header is rendered anywhere in the image, and none is planned as part
of V1. Earlier designs considered a visual header row for the message length
(FEAT-008's byte-level `encodeHeader`/`decodeHeader`, then a digit-prefix variant),
but both were rejected: a header row sitting outside the rotation step leaks the
message length in the clear (the Hexahue alphabet is public, so anyone can read an
unrotated header without the key); a header prefixed into the rotated message
stream still leaks a known-plaintext-at-fixed-position weakness (anyone familiar
with the tool's format knows the first N decoded symbols are always digits,
regardless of the specific key), giving a cheap parameter-guessing oracle either
way. `FEAT-008`'s `encodeHeader`/`decodeHeader` remain in the codebase, tested but
currently unused by the real pipeline. A future evolution may revisit
message-length metadata (e.g. a properly key-dependent encoding, or decode-time
boundary detection via symbol validity), but that is out of scope for V1.
