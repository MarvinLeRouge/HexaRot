# FEAT-009 PNG Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `PngRenderer`, a Sharp-based concrete implementation of a new `Renderer<T>` interface, that paints a `ColorGrid` (message symbols plus random padding, already rotated - the output of `buildGrid` + `RotationEngine`, nothing else) into a PNG buffer at one of three fixed case sizes, using the exact Hexahue standard palette.

**Architecture:** `PngRenderer.render(grid, size)` is a pure, alphabet-agnostic pixel painter: it paints exactly the rectangular `ColorGrid` it receives, one solid `casePixels x casePixels` square per case, using a fixed Hexahue colour-name-to-hex lookup table. There is no metadata header of any kind - see the "Design decision" note below for why an earlier header design (both a separate unrotated header row, and a header prefixed into the rotated message stream) was rejected and removed from this plan.

**Tech Stack:** NestJS 11, TypeScript strict, Jest, Sharp (new dependency, raw pixel buffer construction - no SVG/DOM compositing).

**Spec:** `docs/tests/renderer.md` section 1 (PngRenderer unit tests) and section 3 (integration tests) is the binding test contract. `BACKLOG.md` FEAT-009 is the acceptance-criteria source. `CONTEXT.md` section "Colour Palette" confirms V1 renders only the fixed Hexahue standard palette (no theming).

## Design decision: no metadata header (2026-08-14)

Two header designs were considered and rejected during planning, both for security reasons - discussed and decided with the user before this plan was written:

1. **A separate header row, rendered above the grid, not subject to rotation.** Rejected: the Hexahue alphabet is public, so anyone viewing the image - with or without the key - could read the header's digit symbols directly and recover the exact message length. This also partially defeats the purpose of random padding, since the message/padding boundary becomes directly computable from the leaked length.
2. **Header digits prefixed into the message text, subject to the same rotation as the body** (so it is not readable without the key). Rejected: even though the *content* is protected, the *fact* that "the first N decoded symbols are always digits" is public knowledge about how the tool works, independent of any specific key. This is a known-plaintext-at-fixed-position weakness: for any candidate set of decode parameters, checking "do the first N decoded symbols look like digits" is a cheap, key-independent validity oracle that measurably narrows a brute-force search - a real weakness even though no information leaks without attempting a decode.

The encoded grid is therefore the pre-processed message plus random padding only, exactly as `buildGrid` (FEAT-006) and `RotationEngine` (FEAT-007) already produce it, unchanged. `FEAT-008`'s `encodeHeader`/`decodeHeader` (byte-level `Buffer` functions) remain in the codebase, tested, but are not called by this plan or wired into any pipeline - they are effectively unused pending a future, more carefully designed evolution (properly key-dependent encoding, or decode-time message-boundary detection via symbol validity against the alphabet). Do not resurrect either rejected design without discussing the security implications again first.

## Global Constraints

- TypeScript strict mode, no implicit any.
- English code, comments, commit messages. No em dash, en dash, or curly quotes anywhere - plain ASCII punctuation only (hard house rule).
- Conventional Commits with a mandatory "Modified files:" list on every commit.
- **Hexahue palette (fixed, confirmed by the user - do not substitute or derive alternate values):**
  | Colour name (as stored in `ColorGrid` cells) | Hex |
  |---|---|
  | `purple` | `#ff00ff` |
  | `red` | `#ff0000` |
  | `green` | `#66ff00` |
  | `yellow` | `#ffff00` |
  | `blue` | `#0000ff` (the user called this "dark blue") |
  | `cyan` | `#00ffff` (the user called this "light blue") |
  | `white` | `#ffffff` |
  | `black` | `#000000` |
  | `gray` | `#888888` |

  `blue`/`cyan` are the exact string literals already used throughout the codebase (`backend/prisma/seed.ts`, `backend/test/utils/mock-alphabet.ts`) for what the user described verbally as "dark blue"/"light blue" - use those literals, not "dark blue"/"light blue", as the `ColorGrid` cell values and map keys.
- **Case sizes (pixels per case), from `BACKLOG.md` FEAT-009's suggested values, also used directly in `docs/tests/renderer.md`'s dimension bullets:** `small: 8`, `medium: 16`, `large: 32`.
- **`Renderer<T>.render(grid, size)` receives the grid exactly as `buildGrid` + `RotationEngine` produce it.** No header concept anywhere: width = `grid[0].length * casePixels`, height = `grid.length * casePixels`. Do not add a `messageLength` or `alphabet` parameter to `render()` - the doc's own interface-compliance bullet ("it exposes a `render(grid, size)` method") is exactly two parameters.
- **No antialiasing/interpolation:** every case is painted as one solid `casePixels x casePixels` block of an exact palette RGB triple, so no colour outside the fixed 9-entry palette can ever appear in rendered output pixels.
- `PngRenderer` throws `RangeError` for a malformed input grid: zero rows, a zero-length row, or rows of inconsistent length (not rectangular) - mirrors the project's established guard-clause convention (`build-grid.ts`, `header.ts`, `rotation-engine.ts`).
- The integration test (`docs/tests/renderer.md` section 3) explicitly allows "a complete in-memory fixture" instead of the real seeded database - use an in-memory `VisualAlphabet` fixture (this plan adds `MOCK_HEXAHUE_ALPHABET`), not a real `HexahueAlphabet`/Prisma/database dependency, to keep the test self-contained and fast like the rest of the suite (242 tests currently run with no DB).
- `docs/tests/renderer.md`'s integration test bullet says `sequence [0,90,180,270]`: this is the doc's angle-value shorthand, not the literal `RotationSequence` parameter. `RotationSequence` (`backend/src/key/key-codec.ts`) is a 4-element array of **indices** into `ROTATION_ANGLES = [0, 90, 180, 270]` (`backend/src/rotation/rotation-engine.ts`). Passing the literal values `[0, 90, 180, 270]` as indices would throw (out of bounds past index 3). The index sequence that produces the angle sequence 0deg, 90deg, 180deg, 270deg in order is `[0, 1, 2, 3]` - use that.

---

### Task 1: `Renderer<T>` interface and `CaseSize` type

**Files:**
- Create: `backend/src/shared/types/case-size.type.ts`
- Create: `backend/src/shared/types/renderer.interface.ts`
- Modify: `backend/src/shared/types/index.ts`
- Modify: `BACKLOG.md` (already edited in the main checkout before this worktree existed - see Step 6)
- Modify: `docs/tests/renderer.md` (already edited in the main checkout before this worktree existed - see Step 6)

**Interfaces:**
- Produces: `CaseSize` (`'small' | 'medium' | 'large'`) and `Renderer<T>` (`render(grid: ColorGrid, size: CaseSize): T | Promise<T>`), both exported from `../shared/types` for Task 2 and Task 3 to import.

- [ ] **Step 1: Create the `CaseSize` type**

`backend/src/shared/types/case-size.type.ts`:

```typescript
/**
 * Rendered case size. Maps to a fixed pixel-per-case value - see
 * `CASE_PIXELS` in `renderer/palette.ts`.
 */
export type CaseSize = 'small' | 'medium' | 'large';
```

- [ ] **Step 2: Create the `Renderer<T>` interface**

`backend/src/shared/types/renderer.interface.ts`:

```typescript
import { ColorGrid } from './color-grid.type';
import { CaseSize } from './case-size.type';

/**
 * Contract for a concrete image renderer.
 *
 * `grid` is exactly the ColorGrid produced by the cipher/rotation pipeline
 * (message symbols plus random padding, already rotated) - there is no
 * metadata header of any kind (see this plan's "Design decision" note).
 */
export interface Renderer<T> {
  render(grid: ColorGrid, size: CaseSize): T | Promise<T>;
}
```

- [ ] **Step 3: Export both from the shared types barrel**

Modify `backend/src/shared/types/index.ts` to:

```typescript
export type { ColorGrid } from './color-grid.type';
export type { VisualAlphabet } from './visual-alphabet.interface';
export type { CaseSize } from './case-size.type';
export type { Renderer } from './renderer.interface';
```

- [ ] **Step 4: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors introduced by these two files (pre-existing unrelated errors in other files, if any, are not this task's concern).

- [ ] **Step 5: Bring in the pre-existing BACKLOG.md and docs/tests/renderer.md corrections**

Before this plan was written, `BACKLOG.md` (FEAT-009 and FEAT-010 descriptions/acceptance criteria, `depends-on` lists, and the FEAT-012 description) and `docs/tests/renderer.md` (removing the "Header row" test bullets, the `headerRows` dimension term, and adding a "Design note: no visual header row" section) were corrected in the main checkout to reflect the no-header decision above, but never committed. Copy the current versions of both files from the main repository checkout into this worktree, overwriting the worktree's copies (which still reflect the old, header-based design):

```bash
cp /home/mlr/projets/HexaRot/BACKLOG.md BACKLOG.md
cp /home/mlr/projets/HexaRot/docs/tests/renderer.md docs/tests/renderer.md
```

Verify: `git diff BACKLOG.md docs/tests/renderer.md` should show no mention of "header row" or "headerRows" remaining anywhere in either file's renderer-related sections.

- [ ] **Step 6: Commit**

```bash
git add backend/src/shared/types/case-size.type.ts backend/src/shared/types/renderer.interface.ts backend/src/shared/types/index.ts BACKLOG.md docs/tests/renderer.md
git commit -m "$(cat <<'EOF'
feat(shared): add Renderer<T> interface and CaseSize type

Modified files:
- backend/src/shared/types/case-size.type.ts - new CaseSize type (small/medium/large)
- backend/src/shared/types/renderer.interface.ts - new generic Renderer<T> contract, no header parameter
- backend/src/shared/types/index.ts - export both from the shared types barrel
- BACKLOG.md - remove header-row mentions from FEAT-009/FEAT-010, drop FEAT-008 from their depends-on, correct FEAT-012's description
- docs/tests/renderer.md - remove Header row test bullets and headerRows dimension term, add design-decision note
EOF
)"
```

---

### Task 2: Hexahue palette constants

**Files:**
- Create: `backend/src/renderer/palette.ts`
- Test: `backend/src/renderer/palette.spec.ts`

**Interfaces:**
- Consumes: `CaseSize` from Task 1.
- Produces: `HEXAHUE_COLOR_HEX` (`Readonly<Record<string, string>>`), `CASE_PIXELS` (`Readonly<Record<CaseSize, number>>`), `colorNameToRgb(colorName: string): [number, number, number]` - all consumed by Task 3's `PngRenderer`.

- [ ] **Step 1: Write the failing tests**

`backend/src/renderer/palette.spec.ts`:

```typescript
import { HEXAHUE_COLOR_HEX, CASE_PIXELS, colorNameToRgb } from './palette';

describe('HEXAHUE_COLOR_HEX', () => {
  it('maps all 9 Hexahue palette colours to their exact hex value', () => {
    expect(HEXAHUE_COLOR_HEX).toEqual({
      purple: '#ff00ff',
      red: '#ff0000',
      green: '#66ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      cyan: '#00ffff',
      white: '#ffffff',
      black: '#000000',
      gray: '#888888',
    });
  });
});

describe('CASE_PIXELS', () => {
  it('maps each case size to its pixel-per-case value', () => {
    expect(CASE_PIXELS).toEqual({ small: 8, medium: 16, large: 32 });
  });
});

describe('colorNameToRgb', () => {
  it('resolves each of the 9 palette colours to the correct RGB triple', () => {
    expect(colorNameToRgb('purple')).toEqual([255, 0, 255]);
    expect(colorNameToRgb('red')).toEqual([255, 0, 0]);
    expect(colorNameToRgb('green')).toEqual([102, 255, 0]);
    expect(colorNameToRgb('yellow')).toEqual([255, 255, 0]);
    expect(colorNameToRgb('blue')).toEqual([0, 0, 255]);
    expect(colorNameToRgb('cyan')).toEqual([0, 255, 255]);
    expect(colorNameToRgb('white')).toEqual([255, 255, 255]);
    expect(colorNameToRgb('black')).toEqual([0, 0, 0]);
    expect(colorNameToRgb('gray')).toEqual([136, 136, 136]);
  });

  it('throws a RangeError for a colour name outside the Hexahue palette', () => {
    expect(() => colorNameToRgb('magenta')).toThrow(RangeError);
    expect(() => colorNameToRgb('')).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest palette.spec.ts`
Expected: FAIL with "Cannot find module './palette'"

- [ ] **Step 3: Implement**

`backend/src/renderer/palette.ts`:

```typescript
import { CaseSize } from '../shared/types';

/**
 * Hexahue standard palette: colour name (as stored in ColorGrid cells) to
 * hex RGB string. V1 renders only this fixed palette (see CONTEXT.md,
 * "Colour Palette" - alternate themes are out of scope).
 */
export const HEXAHUE_COLOR_HEX: Readonly<Record<string, string>> = {
  purple: '#ff00ff',
  red: '#ff0000',
  green: '#66ff00',
  yellow: '#ffff00',
  blue: '#0000ff',
  cyan: '#00ffff',
  white: '#ffffff',
  black: '#000000',
  gray: '#888888',
};

/** Pixel size (width and height) of a single colour case, per case-size option. */
export const CASE_PIXELS: Readonly<Record<CaseSize, number>> = {
  small: 8,
  medium: 16,
  large: 32,
};

/**
 * Resolves a Hexahue colour name to its RGB triple.
 *
 * @throws {RangeError} If the colour name is not part of the Hexahue palette.
 */
export function colorNameToRgb(colorName: string): [number, number, number] {
  const hex = HEXAHUE_COLOR_HEX[colorName];
  if (!hex) {
    throw new RangeError(
      `Unknown colour "${colorName}", expected one of: ${Object.keys(HEXAHUE_COLOR_HEX).join(', ')}`,
    );
  }
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest palette.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/renderer/palette.ts backend/src/renderer/palette.spec.ts
git commit -m "$(cat <<'EOF'
feat(renderer): add Hexahue palette constants and colour-to-RGB lookup

Modified files:
- backend/src/renderer/palette.ts - HEXAHUE_COLOR_HEX, CASE_PIXELS, colorNameToRgb with RangeError guard
- backend/src/renderer/palette.spec.ts - palette mapping and unknown-colour error tests
EOF
)"
```

---

### Task 3: `PngRenderer` (Sharp) and its unit tests

**Files:**
- Create: `backend/src/renderer/png-renderer.ts`
- Modify: `backend/src/renderer/renderer.module.ts`
- Create: `backend/src/renderer/__fixtures__/renderer.fixtures.ts`
- Test: `backend/src/renderer/png-renderer.spec.ts`
- Modify: `backend/package.json` (adds `sharp` dependency via `npm install`)

**Interfaces:**
- Consumes: `Renderer<T>`, `CaseSize`, `ColorGrid` from Task 1; `CASE_PIXELS`, `colorNameToRgb` from Task 2.
- Produces: `PngRenderer` (implements `Renderer<Buffer>`), registered as a provider in `RendererModule`. `MOCK_ROTATED_GRID_4x6`, `HEXAHUE_PALETTE_MAP`, `EXPECTED_PNG_DIMENSIONS` fixtures, consumed by this task's own tests and by Task 4's integration test.

- [ ] **Step 1: Install Sharp**

Run: `cd backend && npm install sharp`
Expected: `sharp` added to `dependencies` in `backend/package.json` and `backend/package-lock.json` updated. Sharp ships its own TypeScript types; no separate `@types/sharp` package needed.

- [ ] **Step 2: Create the fixtures file**

`backend/src/renderer/__fixtures__/renderer.fixtures.ts`:

```typescript
import { ColorGrid, CaseSize } from '../../shared/types';

/** A hardcoded 4-column x 6-row pre-rotated grid, ready for rendering. */
export const MOCK_ROTATED_GRID_4x6: ColorGrid = [
  ['red', 'green', 'blue', 'yellow'],
  ['cyan', 'purple', 'black', 'white'],
  ['gray', 'red', 'green', 'blue'],
  ['yellow', 'cyan', 'purple', 'black'],
  ['white', 'gray', 'red', 'green'],
  ['blue', 'yellow', 'cyan', 'purple'],
];

/** Every Hexahue palette colour mapped to its expected RGB tuple and hex string. */
export const HEXAHUE_PALETTE_MAP: Record<
  string,
  { rgb: [number, number, number]; hex: string }
> = {
  purple: { rgb: [255, 0, 255], hex: '#ff00ff' },
  red: { rgb: [255, 0, 0], hex: '#ff0000' },
  green: { rgb: [102, 255, 0], hex: '#66ff00' },
  yellow: { rgb: [255, 255, 0], hex: '#ffff00' },
  blue: { rgb: [0, 0, 255], hex: '#0000ff' },
  cyan: { rgb: [0, 255, 255], hex: '#00ffff' },
  white: { rgb: [255, 255, 255], hex: '#ffffff' },
  black: { rgb: [0, 0, 0], hex: '#000000' },
  gray: { rgb: [136, 136, 136], hex: '#888888' },
};

/** Case-size -> { casePixels } used by tests to compute expected PNG dimensions. */
export const EXPECTED_PNG_DIMENSIONS: Record<CaseSize, { casePixels: number }> = {
  small: { casePixels: 8 },
  medium: { casePixels: 16 },
  large: { casePixels: 32 },
};
```

- [ ] **Step 3: Write the failing tests**

`backend/src/renderer/png-renderer.spec.ts`:

```typescript
import sharp from 'sharp';
import { ColorGrid } from '../shared/types';
import { PngRenderer } from './png-renderer';
import {
  MOCK_ROTATED_GRID_4x6,
  HEXAHUE_PALETTE_MAP,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

describe('PngRenderer', () => {
  const renderer = new PngRenderer();

  describe('interface compliance', () => {
    it('exposes a render(grid, size) method returning a Promise<Buffer>', () => {
      const result = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(result).toBeInstanceOf(Promise);
      return result.then((buffer) => {
        expect(Buffer.isBuffer(buffer)).toBe(true);
      });
    });
  });

  describe('output validity', () => {
    it('returns a Buffer (not null, not undefined)', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(buffer).not.toBeNull();
      expect(buffer).not.toBeUndefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('returns a buffer whose first bytes match the PNG magic number', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(buffer.subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
    });
  });

  describe('dimensions - case size: small (8px per case)', () => {
    it('produces an image of width = gridWidthInCases x 8', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 8', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });
  });

  describe('dimensions - case size: medium (16px per case)', () => {
    it('produces an image of width = gridWidthInCases x 16', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 16', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
    });
  });

  describe('dimensions - case size: large (32px per case)', () => {
    it('produces an image of width = gridWidthInCases x 32', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 32', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });
  });

  describe('colour accuracy', () => {
    it('maps each Hexahue palette colour to the correct RGB value', async () => {
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      for (let caseY = 0; caseY < MOCK_ROTATED_GRID_4x6.length; caseY++) {
        for (let caseX = 0; caseX < MOCK_ROTATED_GRID_4x6[caseY].length; caseX++) {
          const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
          const expectedRgb = HEXAHUE_PALETTE_MAP[colorName].rgb;
          const px = caseX * casePixels;
          const py = caseY * casePixels;
          const offset = (py * info.width + px) * info.channels;
          expect([data[offset], data[offset + 1], data[offset + 2]]).toEqual(
            expectedRgb,
          );
        }
      }
    });

    it('does not introduce colours outside the Hexahue palette for non-padding cells', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const knownRgbs = new Set(
        Object.values(HEXAHUE_PALETTE_MAP).map(({ rgb }) => rgb.join(',')),
      );

      for (let i = 0; i < data.length; i += info.channels) {
        const pixel = [data[i], data[i + 1], data[i + 2]].join(',');
        expect(knownRgbs.has(pixel)).toBe(true);
      }
    });
  });

  describe('input validation', () => {
    it('throws a RangeError for an empty grid (zero rows)', async () => {
      await expect(renderer.render([], 'small')).rejects.toThrow(RangeError);
    });

    it('throws a RangeError for a grid with a zero-length row', async () => {
      await expect(renderer.render([[]], 'small')).rejects.toThrow(
        RangeError,
      );
    });

    it('throws a RangeError for a grid with inconsistent row lengths', async () => {
      const raggedGrid: ColorGrid = [
        ['red', 'green'],
        ['blue'],
      ];
      await expect(renderer.render(raggedGrid, 'small')).rejects.toThrow(
        RangeError,
      );
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd backend && npx jest png-renderer.spec.ts`
Expected: FAIL with "Cannot find module './png-renderer'"

- [ ] **Step 5: Implement `PngRenderer`**

`backend/src/renderer/png-renderer.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ColorGrid, CaseSize, Renderer } from '../shared/types';
import { CASE_PIXELS, colorNameToRgb } from './palette';

const CHANNELS = 3; // RGB, no alpha

/**
 * Renders a ColorGrid (message symbols plus random padding, already
 * rotated - no header of any kind) to a PNG buffer using Sharp. Each
 * colour case is painted as a solid casePixels x casePixels square via
 * direct raw-buffer writes - no interpolation, so only exact Hexahue
 * palette colours ever appear in the output.
 */
@Injectable()
export class PngRenderer implements Renderer<Buffer> {
  async render(grid: ColorGrid, size: CaseSize): Promise<Buffer> {
    const gridHeightInCases = grid.length;
    if (gridHeightInCases === 0) {
      throw new RangeError('grid must have at least one row');
    }
    const gridWidthInCases = grid[0].length;
    if (gridWidthInCases === 0) {
      throw new RangeError('grid rows must have at least one case');
    }
    for (const row of grid) {
      if (row.length !== gridWidthInCases) {
        throw new RangeError('grid rows must all have the same length');
      }
    }

    const casePixels = CASE_PIXELS[size];
    const widthPx = gridWidthInCases * casePixels;
    const heightPx = gridHeightInCases * casePixels;

    const pixels = Buffer.alloc(widthPx * heightPx * CHANNELS);

    for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
      for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
        const [r, g, b] = colorNameToRgb(grid[caseY][caseX]);
        const baseX = caseX * casePixels;
        const baseY = caseY * casePixels;

        for (let dy = 0; dy < casePixels; dy++) {
          const rowOffset = (baseY + dy) * widthPx * CHANNELS;
          for (let dx = 0; dx < casePixels; dx++) {
            const pixelOffset = rowOffset + (baseX + dx) * CHANNELS;
            pixels[pixelOffset] = r;
            pixels[pixelOffset + 1] = g;
            pixels[pixelOffset + 2] = b;
          }
        }
      }
    }

    return sharp(pixels, {
      raw: { width: widthPx, height: heightPx, channels: CHANNELS },
    })
      .png()
      .toBuffer();
  }
}
```

- [ ] **Step 6: Register `PngRenderer` in `RendererModule`**

Modify `backend/src/renderer/renderer.module.ts` to:

```typescript
import { Module } from '@nestjs/common';
import { PngRenderer } from './png-renderer';

@Module({
  providers: [PngRenderer],
  exports: [PngRenderer],
})
export class RendererModule {}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && npx jest png-renderer.spec.ts palette.spec.ts`
Expected: PASS (18 tests: 4 from palette.spec.ts, 14 from png-renderer.spec.ts - 1 interface compliance + 2 output validity + 6 dimensions (3 sizes x 2) + 2 colour accuracy + 3 input validation). This task's test file has no "header row" describe block - that concept was removed along with the header design.

- [ ] **Step 8: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/renderer`
Expected: all tests pass (242 + 18 new = 260), eslint clean.

- [ ] **Step 9: Commit**

```bash
git add backend/src/renderer/png-renderer.ts backend/src/renderer/renderer.module.ts backend/src/renderer/__fixtures__/renderer.fixtures.ts backend/src/renderer/png-renderer.spec.ts backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
feat(renderer): implement PngRenderer with Sharp raw pixel painting

Modified files:
- backend/src/renderer/png-renderer.ts - PngRenderer implements Renderer<Buffer>, solid-block Sharp raw buffer painting, no header logic
- backend/src/renderer/renderer.module.ts - register PngRenderer as a provider
- backend/src/renderer/__fixtures__/renderer.fixtures.ts - MOCK_ROTATED_GRID_4x6, HEXAHUE_PALETTE_MAP, EXPECTED_PNG_DIMENSIONS
- backend/src/renderer/png-renderer.spec.ts - unit tests: interface compliance, output validity, dimensions (3 sizes), colour accuracy, input validation
- backend/package.json, backend/package-lock.json - add sharp dependency
EOF
)"
```

---

### Task 4: Integration tests (full pipeline)

**Files:**
- Create: `backend/src/renderer/png-renderer.integration.spec.ts`
- Modify: `backend/src/renderer/__fixtures__/renderer.fixtures.ts` (add `MOCK_HEXAHUE_ALPHABET`)

**Interfaces:**
- Consumes: `preprocess` (`backend/src/cipher/preprocess.ts`), `buildGrid` (`backend/src/cipher/build-grid.ts`), `RotationEngine` (`backend/src/rotation/rotation-engine.ts`), `ReadingOrderRegistry` (`backend/src/reading-order/reading-order.registry.ts`), `PngRenderer` (Task 3).

- [ ] **Step 1: Add the in-memory alphabet fixture**

Append to `backend/src/renderer/__fixtures__/renderer.fixtures.ts`:

```typescript
import { VisualAlphabet } from '../../shared/types';

/**
 * Minimal in-memory VisualAlphabet double with real Hexahue dimensions
 * (2 wide x 3 tall), supporting 'A' and 'B' - enough to run the full
 * pipeline end-to-end without a real database, per docs/tests/renderer.md
 * section 3's explicit allowance for "a complete in-memory fixture".
 */
export const MOCK_HEXAHUE_ALPHABET: VisualAlphabet = {
  symbolWidth: 2,
  symbolHeight: 3,
  getBlock(char: string) {
    const blocks: Record<string, string[][]> = {
      A: [
        ['red', 'green'],
        ['blue', 'yellow'],
        ['cyan', 'purple'],
      ],
      B: [
        ['green', 'red'],
        ['yellow', 'blue'],
        ['purple', 'cyan'],
      ],
    };
    const grid = blocks[char];
    if (!grid) {
      throw new Error(`unsupported character: ${char}`);
    }
    return grid;
  },
  getSupportedChars() {
    return ['A', 'B'];
  },
};
```

- [ ] **Step 2: Write the integration tests**

`backend/src/renderer/png-renderer.integration.spec.ts`:

```typescript
import sharp from 'sharp';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from './png-renderer';
import {
  MOCK_HEXAHUE_ALPHABET,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

/**
 * Runs the full encoding pipeline (preprocess -> buildGrid -> rotate ->
 * render) for a known short message, as required by
 * docs/tests/renderer.md section 3.
 *
 * T=5, LR-TB, sequence [0,90,180,270] (index sequence [0,1,2,3] - see this
 * plan's Global Constraints for why), CW, size medium. No header anywhere
 * in this pipeline - see this plan's "Design decision" note.
 */
async function encodeAndRender(): Promise<Buffer> {
  const alphabet = MOCK_HEXAHUE_ALPHABET;
  const pivotBlockSize = 5;

  const { text } = preprocess('AB', alphabet);
  const bodyGrid = buildGrid(text, alphabet, pivotBlockSize);

  const rotationEngine = new RotationEngine(new ReadingOrderRegistry());
  const rotatedGrid = rotationEngine.encode(
    bodyGrid,
    pivotBlockSize,
    [0, 1, 2, 3],
    'cw',
    'LR-TB',
  );

  const renderer = new PngRenderer();
  return renderer.render(rotatedGrid, 'medium');
}

describe('PngRenderer - integration', () => {
  it('encodes the message AB with T=5, LR-TB, sequence [0,90,180,270], CW, size medium and produces a PNG whose width equals the expected pixel value', async () => {
    const buffer = await encodeAndRender();
    const meta = await sharp(buffer).metadata();

    const expectedGridWidthInCases = 10; // lcm(pivotBlockSize=5, symbolWidth=2)
    expect(meta.width).toBe(
      expectedGridWidthInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });

  it('encodes the message AB with the same params and produces a PNG whose height equals the expected pixel value', async () => {
    const buffer = await encodeAndRender();
    const meta = await sharp(buffer).metadata();

    const expectedGridHeightInCases = 5; // ceil(symbolHeight=3 / pivotBlockSize=5) * 5
    expect(meta.height).toBe(
      expectedGridHeightInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npx jest png-renderer.integration.spec.ts`
Expected: PASS (2 tests). If the width/height assertions fail, recompute `expectedGridWidthInCases`/`expectedGridHeightInCases` by hand from `buildGrid`'s adaptive-width formula (`docs/tests/cipher.md` section 4) using `pivotBlockSize=5`, `symbolWidth=2`, `symbolHeight=3`, `messageLength=2` - do not adjust `PngRenderer` to make the numbers match; the arithmetic in this plan was verified by hand when this plan was written.

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: all tests pass (242 base + 18 from Task 2/3 + 2 integration = 262 total; no pre-existing test should regress).

- [ ] **Step 5: Commit**

```bash
git add backend/src/renderer/png-renderer.integration.spec.ts backend/src/renderer/__fixtures__/renderer.fixtures.ts
git commit -m "$(cat <<'EOF'
test(renderer): add PngRenderer integration tests for the full pipeline

Modified files:
- backend/src/renderer/png-renderer.integration.spec.ts - preprocess to buildGrid to rotate to render, dimension assertions
- backend/src/renderer/__fixtures__/renderer.fixtures.ts - add MOCK_HEXAHUE_ALPHABET in-memory fixture (2x3 dims, A/B)
EOF
)"
```

---

## After this plan

FEAT-010 (SvgRenderer) implements the same `Renderer<T>` interface (`Renderer<string>`, synchronous) using the same `HEXAHUE_COLOR_HEX`/`CASE_PIXELS` constants from `renderer/palette.ts` - no new design decisions needed there, and no header logic either.

FEAT-011 (API `/encode` endpoint) and FEAT-012 (API `/decode` endpoint) are unaffected in structure by this plan's header decision, except that FEAT-012's decode side has an **open design question**: without a header, how does decode determine where the real message ends and random padding begins? The candidate approach discussed during this plan's design (not built here, out of scope for encoding): decode symbol-by-symbol in the same order `buildGrid` used, stopping at the first block that does not match any character in the alphabet - accepting a small probability that a random padding block coincidentally matches a real symbol. The exact collision rate needs proper analysis at FEAT-012 design time: padding is drawn only from alphabet-present colours via `getPalette()` (`backend/src/cipher/build-grid.ts`), not uniformly from the full 9-colour palette, and real Hexahue symbol blocks are structured rather than arbitrary, so a naive combinatorial estimate over all possible 2x3 colour combinations is likely optimistic. This is an open quantitative question deferred to FEAT-012's own design work.
