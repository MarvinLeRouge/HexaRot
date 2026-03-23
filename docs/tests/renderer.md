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
- it produces an image of height = (gridHeightInCases + headerRows) × 8 for a known grid

**Dimensions — case size: medium (16px per case)**
- it produces an image of width = gridWidthInCases × 16
- it produces an image of height = (gridHeightInCases + headerRows) × 16

**Dimensions — case size: large (32px per case)**
- it produces an image of width = gridWidthInCases × 32
- it produces an image of height = (gridHeightInCases + headerRows) × 32

**Colour accuracy**
- it maps each Hexahue palette colour to the correct RGB value
- it does not introduce colours outside the Hexahue palette for non-padding cells

**Header row**
- it renders the header above the grid (not below, not overlapping)
- it renders the header at the correct pixel height

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
- it sets viewBox height = (gridHeightInCases + headerRows) × caseSize for size: small
- it sets correct viewBox for size: medium
- it sets correct viewBox for size: large

**rect elements**
- it produces exactly gridWidthInCases × gridHeightInCases `<rect>` elements for the grid
- it produces the correct number of additional `<rect>` elements for the header
- it sets the `fill` attribute of each `<rect>` to the correct Hexahue hex colour value
- it sets `x`, `y`, `width`, `height` attributes on every `<rect>`

**Colour accuracy**
- it maps each Hexahue palette colour to the correct hex colour string (e.g. '#FF0000')

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
  correct total number of `<rect>` elements (grid cells + header cells)

---

## Fixtures

The following shared fixtures must be defined in `__fixtures__/renderer.fixtures.ts`:

- `MOCK_ROTATED_GRID_4x6` — a hardcoded 4-column × 6-row ColorGrid (all cells with
  known palette colours), representing a pre-rotated grid ready for rendering.
- `HEXAHUE_PALETTE_MAP` — map of colour name → expected RGB tuple and hex string,
  covering all colours in the Hexahue palette.
- `EXPECTED_PNG_DIMENSIONS` — map of size option → `{ casePixels, headerRows }` for
  computing expected output dimensions.
