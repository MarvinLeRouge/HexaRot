# FEAT-010 SVG Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `SvgRenderer`, a native string-templated implementation of the `Renderer<T>` interface (no DOM library), that paints a `ColorGrid` (message symbols plus random padding, already rotated - no header of any kind) into a well-formed, self-contained SVG string at one of three fixed case sizes, using the exact Hexahue standard palette already established by `PngRenderer` (FEAT-009).

**Architecture:** `SvgRenderer.render(grid, size)` builds one `<rect>` element per colour case via plain string concatenation, wrapped in a single `<svg>` root with a `viewBox` sized to the grid. It reuses `renderer/palette.ts`'s existing `CASE_PIXELS` and `HEXAHUE_COLOR_HEX` constants - no new colour or size data. As part of this plan, two small safe-lookup helpers already duplicated inline in `PngRenderer` (the size-to-pixels guard) and implicit in `colorNameToRgb` (the colour-name guard) are consolidated into `palette.ts` as `getCasePixels` and `colorNameToHex`, so both renderers share one guarded implementation instead of two copies that could drift (this directly closes the "hardening point before a second consumer arrives" the FEAT-009 final review flagged and deferred to this feature).

**Tech Stack:** NestJS 11, TypeScript strict, Jest, `fast-xml-parser` (new devDependency, test-only - used to verify the generated SVG is well-formed XML and to parse `<rect>` elements for assertions; the renderer implementation itself uses no XML/DOM library, per the plan's own architecture).

**Spec:** `docs/tests/renderer.md` section 2 (SvgRenderer unit tests) and section 3 (SvgRenderer integration tests) is the binding test contract. `BACKLOG.md` FEAT-010 is the acceptance-criteria source. `CONTEXT.md` section "Colour Palette" confirms V1 renders only the fixed Hexahue standard palette (no theming). There is no metadata header anywhere in this design - see `docs/tests/renderer.md`, "Design note: no visual header row", for the security rationale (already implemented and merged in FEAT-009; nothing about that decision changes here).

## Global Constraints

- TypeScript strict mode, no implicit any.
- English code, comments, commit messages. No em dash, en dash, or curly quotes anywhere - plain ASCII punctuation only (hard house rule; this rule was violated and had to be fixed multiple times during FEAT-009's execution - check every file, including markdown, with extra care).
- Conventional Commits with a mandatory "Modified files:" list on every commit.
- **`SvgRenderer.render(grid, size)` returns a plain `string` synchronously** (not `Promise<string>`) - `Renderer<T>`'s `T | Promise<T>` return type already accommodates this without any interface change. Exactly two parameters, matching `PngRenderer`'s established shape - no header/messageLength/alphabet parameter.
- **No metadata header anywhere.** Same rule as FEAT-009: `SvgRenderer` paints exactly the `ColorGrid` it is given, nothing more. Width/height come only from `grid[0].length`/`grid.length` times `casePixels`.
- **Case sizes and palette are already fixed and shipped** in `backend/src/renderer/palette.ts` (`CASE_PIXELS`: small=8, medium=16, large=32; `HEXAHUE_COLOR_HEX`: 9 entries, exact hex values already committed) - do not redefine or duplicate these constants anywhere. Import and reuse them.
- **SVG must start with the literal characters `<svg`** - no XML declaration prologue (`<?xml version="1.0"?>`) before it; the doc's own test bullet checks `startsWith('<svg')`.
- **SVG root must include `xmlns="http://www.w3.org/2000/svg"`** so the output is valid as a standalone file (not just inline-in-HTML), and `viewBox="0 0 {widthPx} {heightPx}"` plus literal `width`/`height` attributes on the root for correct intrinsic sizing when opened directly.
- **Self-contained:** no `href`, `src`, or `xlink` attributes anywhere in the output - trivially true since the implementation never emits them, but the tests must actually check their absence, not just assume it.
- **One `<rect>` per colour case**, self-closing XML syntax (`<rect .../>`), with `x`, `y`, `width`, `height`, `fill` attributes on every one. `fill` is the exact lowercase hex string from `HEXAHUE_COLOR_HEX` (e.g. `#ff0000`) - no case transformation, matching the existing `HEXAHUE_PALETTE_MAP` fixture's own lowercase `hex` field (already used by `PngRenderer`'s tests).
- `SvgRenderer` throws `RangeError` for the same three malformed-grid cases `PngRenderer` already guards: zero rows, a zero-length row, rows of inconsistent length (not rectangular) - and for an unrecognised colour name or an invalid `size` value, via the shared `palette.ts` helpers added in Task 1.
- No arbitrary/user-controlled text ever appears in an attribute value (only numbers and fixed hex colour strings), so no XML-escaping logic is needed in the renderer itself - confirm this stays true; if any future change introduces free text into SVG output, escaping must be added then, not assumed unnecessary forever.
- Reuse the existing fixtures in `backend/src/renderer/__fixtures__/renderer.fixtures.ts` (`MOCK_ROTATED_GRID_4x6`, `HEXAHUE_PALETTE_MAP`, `EXPECTED_PNG_DIMENSIONS`, `MOCK_HEXAHUE_ALPHABET`) - do not create new ones with overlapping purpose. `EXPECTED_PNG_DIMENSIONS`'s name is PNG-specific from FEAT-009 but its `casePixels` values are renderer-agnostic and already used generically per `docs/tests/renderer.md`'s own Fixtures section - do not rename it as part of this plan (out of scope, avoid touching FEAT-009's committed code beyond the `palette.ts` consolidation described above).
- The integration tests (`docs/tests/renderer.md` section 3) use the same T=5, message="AB", LR-TB, sequence [0,1,2,3] (index sequence - see FEAT-009's plan for why literal `[0,90,180,270]` would be wrong), CW, size=medium scenario as `PngRenderer`'s integration test, over the same in-memory `MOCK_HEXAHUE_ALPHABET` fixture (not a real database-backed `HexahueAlphabet`). Expected grid dimensions (verified by hand in FEAT-009's plan, unchanged here): 10 cases wide, 5 cases tall - so viewBox `"0 0 160 80"` and exactly 50 `<rect>` elements at size=medium.

---

### Task 1: Consolidate palette helpers (`getCasePixels`, `colorNameToHex`)

**Files:**
- Modify: `backend/src/renderer/palette.ts`
- Modify: `backend/src/renderer/palette.spec.ts`
- Modify: `backend/src/renderer/png-renderer.ts`

**Interfaces:**
- Consumes: existing `HEXAHUE_COLOR_HEX`, `CASE_PIXELS`, `CaseSize` (already in `palette.ts`/`shared/types`).
- Produces: `colorNameToHex(colorName: string): string` and `getCasePixels(size: CaseSize): number`, both exported from `palette.ts`, consumed by Task 2's `SvgRenderer` and by the refactored `PngRenderer`.

This is a small, behavior-preserving refactor: `PngRenderer`'s existing inline `size` guard and `colorNameToRgb`'s existing inline colour guard move into two reusable functions, so `SvgRenderer` (Task 2) does not duplicate the same guard logic a third time. Every existing test in `palette.spec.ts` and `png-renderer.spec.ts` must keep passing unchanged - this task adds new tests, it does not remove or weaken any.

- [ ] **Step 1: Write the failing tests for the two new functions**

Add to `backend/src/renderer/palette.spec.ts` (append; do not remove or modify any existing test in this file):

```typescript
import {
  HEXAHUE_COLOR_HEX,
  CASE_PIXELS,
  colorNameToRgb,
  colorNameToHex,
  getCasePixels,
} from './palette';

// ... (existing describe blocks for HEXAHUE_COLOR_HEX, CASE_PIXELS, colorNameToRgb stay exactly as they are)

describe('colorNameToHex', () => {
  it('resolves each of the 9 palette colours to its exact hex string', () => {
    expect(colorNameToHex('purple')).toBe('#ff00ff');
    expect(colorNameToHex('red')).toBe('#ff0000');
    expect(colorNameToHex('green')).toBe('#66ff00');
    expect(colorNameToHex('yellow')).toBe('#ffff00');
    expect(colorNameToHex('blue')).toBe('#0000ff');
    expect(colorNameToHex('cyan')).toBe('#00ffff');
    expect(colorNameToHex('white')).toBe('#ffffff');
    expect(colorNameToHex('black')).toBe('#000000');
    expect(colorNameToHex('gray')).toBe('#888888');
  });

  it('throws a RangeError for a colour name outside the Hexahue palette', () => {
    expect(() => colorNameToHex('magenta')).toThrow(RangeError);
    expect(() => colorNameToHex('')).toThrow(RangeError);
  });

  it('throws a RangeError for a colour name matching an Object.prototype member', () => {
    expect(() => colorNameToHex('constructor')).toThrow(RangeError);
    expect(() => colorNameToHex('toString')).toThrow(RangeError);
  });
});

describe('getCasePixels', () => {
  it('resolves each case size to its pixel-per-case value', () => {
    expect(getCasePixels('small')).toBe(8);
    expect(getCasePixels('medium')).toBe(16);
    expect(getCasePixels('large')).toBe(32);
  });

  it('throws a RangeError for an invalid size value', () => {
    expect(() => getCasePixels('huge' as unknown as Parameters<typeof getCasePixels>[0])).toThrow(
      RangeError,
    );
  });
});
```

Note: `import { HEXAHUE_COLOR_HEX, CASE_PIXELS, colorNameToRgb } from './palette';` already exists at the top of this file from FEAT-009 - extend that same import statement to add `colorNameToHex, getCasePixels` rather than adding a second import line.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd backend && npx jest palette.spec.ts`
Expected: FAIL with "colorNameToHex is not a function" / "getCasePixels is not a function" (the existing tests for `HEXAHUE_COLOR_HEX`/`CASE_PIXELS`/`colorNameToRgb` still pass).

- [ ] **Step 3: Implement the two new functions and refactor `colorNameToRgb`**

Modify `backend/src/renderer/palette.ts`. Keep `HEXAHUE_COLOR_HEX` and `CASE_PIXELS` exactly as they are (do not change their values or the `Object.freeze` wrapping). Add `colorNameToHex` above `colorNameToRgb`, then rewrite `colorNameToRgb` to call it instead of duplicating the guard, and add `getCasePixels`:

```typescript
/**
 * Resolves a Hexahue colour name to its hex string.
 *
 * @throws {RangeError} If the colour name is not part of the Hexahue palette.
 */
export function colorNameToHex(colorName: string): string {
  if (!Object.prototype.hasOwnProperty.call(HEXAHUE_COLOR_HEX, colorName)) {
    throw new RangeError(
      `Unknown colour "${colorName}", expected one of: ${Object.keys(HEXAHUE_COLOR_HEX).join(', ')}`,
    );
  }
  return HEXAHUE_COLOR_HEX[colorName];
}

/**
 * Resolves a Hexahue colour name to its RGB triple.
 *
 * @throws {RangeError} If the colour name is not part of the Hexahue palette.
 */
export function colorNameToRgb(colorName: string): [number, number, number] {
  const hex = colorNameToHex(colorName);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Resolves a case size to its pixel-per-case value.
 *
 * @throws {RangeError} If size is not a valid CaseSize value.
 */
export function getCasePixels(size: CaseSize): number {
  const casePixels = CASE_PIXELS[size];
  if (casePixels === undefined) {
    throw new RangeError(
      `size must be one of: ${Object.keys(CASE_PIXELS).join(', ')}, got "${size}"`,
    );
  }
  return casePixels;
}
```

Remove the old inline body of `colorNameToRgb` (the duplicated `hasOwnProperty` guard) - it is fully replaced by the version above that delegates to `colorNameToHex`.

- [ ] **Step 4: Refactor `PngRenderer` to use `getCasePixels`**

Modify `backend/src/renderer/png-renderer.ts`. It currently has its own inline guard (added during FEAT-009's final review fix wave):

```typescript
const casePixels = CASE_PIXELS[size];
if (casePixels === undefined) {
  throw new RangeError(
    `size must be one of: ${Object.keys(CASE_PIXELS).join(', ')}, got "${size}"`,
  );
}
```

Replace it with:

```typescript
const casePixels = getCasePixels(size);
```

Update the import at the top of the file from `import { CASE_PIXELS, colorNameToRgb } from './palette';` to `import { getCasePixels, colorNameToRgb } from './palette';` (drop the now-unused direct `CASE_PIXELS` import from this file - `png-renderer.spec.ts`'s own import of `CASE_PIXELS`, if any, is unaffected since fixtures import directly from `palette.ts`, not through `png-renderer.ts`).

- [ ] **Step 5: Run tests to verify everything passes**

Run: `cd backend && npx jest palette.spec.ts png-renderer.spec.ts png-renderer.integration.spec.ts`
Expected: PASS, all tests from all three files, including every pre-existing test from FEAT-009 unchanged in behavior (this step's whole point is confirming the refactor did not alter any observable behavior).

- [ ] **Step 6: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/renderer`
Expected: all tests pass (264 baseline + 5 new = 269), eslint clean.

- [ ] **Step 7: Commit**

```bash
git add backend/src/renderer/palette.ts backend/src/renderer/palette.spec.ts backend/src/renderer/png-renderer.ts
git commit -m "$(cat <<'EOF'
refactor(renderer): consolidate colour and size guards into shared palette helpers

Modified files:
- backend/src/renderer/palette.ts - add colorNameToHex and getCasePixels, refactor colorNameToRgb to reuse colorNameToHex
- backend/src/renderer/palette.spec.ts - tests for the two new functions, including the Object.prototype regression case
- backend/src/renderer/png-renderer.ts - use getCasePixels instead of its own inline size guard, behavior unchanged
EOF
)"
```

---

### Task 2: `SvgRenderer` and its unit tests

**Files:**
- Create: `backend/src/renderer/svg-renderer.ts`
- Modify: `backend/src/renderer/renderer.module.ts`
- Test: `backend/src/renderer/svg-renderer.spec.ts`
- Modify: `backend/package.json` (adds `fast-xml-parser` devDependency via `npm install --save-dev`)

**Interfaces:**
- Consumes: `Renderer<T>`, `CaseSize`, `ColorGrid` from `shared/types`; `getCasePixels`, `colorNameToHex` from Task 1's `palette.ts`; `MOCK_ROTATED_GRID_4x6`, `HEXAHUE_PALETTE_MAP`, `EXPECTED_PNG_DIMENSIONS` from the existing `renderer.fixtures.ts` (FEAT-009, unchanged).
- Produces: `SvgRenderer` (implements `Renderer<string>`), registered as a provider in `RendererModule` alongside `PngRenderer`.

- [ ] **Step 1: Install fast-xml-parser as a devDependency**

Run: `cd backend && npm install --save-dev fast-xml-parser`
Expected: `fast-xml-parser` added to `devDependencies` in `backend/package.json` and `backend/package-lock.json` updated. This is test-only tooling (used in Step 3's spec file to validate well-formedness and parse `<rect>` elements) - `svg-renderer.ts` itself must never import it, per this plan's "native string-based SVG generation without DOM" architecture.

- [ ] **Step 2: Write the failing tests**

`backend/src/renderer/svg-renderer.spec.ts`:

```typescript
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ColorGrid } from '../shared/types';
import { SvgRenderer } from './svg-renderer';
import {
  MOCK_ROTATED_GRID_4x6,
  HEXAHUE_PALETTE_MAP,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

describe('SvgRenderer', () => {
  const renderer = new SvgRenderer();

  describe('interface compliance', () => {
    it('exposes a render(grid, size) method returning a string', () => {
      const result = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(typeof result).toBe('string');
    });
  });

  describe('output validity', () => {
    it('returns a string starting with <svg', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(svg.startsWith('<svg')).toBe(true);
    });

    it('returns a well-formed SVG (parseable by a standard XML parser)', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const validation = XMLValidator.validate(svg);
      expect(validation).toBe(true);
    });

    it('is self-contained: no external href, src, or xlink references', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(svg).not.toContain('href=');
      expect(svg).not.toContain('src=');
      expect(svg).not.toContain('xlink');
    });
  });

  describe('viewBox', () => {
    it('sets viewBox width = gridWidthInCases x caseSize for size: small', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parser.parse(svg);
      const [, , width] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('sets viewBox height = gridHeightInCases x caseSize for size: small', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parser.parse(svg);
      const [, , , height] = parsed.svg.viewBox.split(' ');
      expect(Number(height)).toBe(6 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('sets correct viewBox for size: medium', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const parsed = parser.parse(svg);
      const [, , width, height] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
      expect(Number(height)).toBe(6 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
    });

    it('sets correct viewBox for size: large', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const parsed = parser.parse(svg);
      const [, , width, height] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
      expect(Number(height)).toBe(6 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });
  });

  describe('rect elements', () => {
    it('produces exactly gridWidthInCases x gridHeightInCases rect elements', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parser.parse(svg);
      const rects = Array.isArray(parsed.svg.rect) ? parsed.svg.rect : [parsed.svg.rect];
      expect(rects.length).toBe(4 * 6);
    });

    it('sets the fill attribute of each rect to the correct Hexahue hex colour value', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;
      const parsed = parser.parse(svg);
      const rects = Array.isArray(parsed.svg.rect) ? parsed.svg.rect : [parsed.svg.rect];

      for (const rect of rects) {
        const caseX = Number(rect.x) / casePixels;
        const caseY = Number(rect.y) / casePixels;
        const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
        expect(rect.fill).toBe(HEXAHUE_PALETTE_MAP[colorName].hex);
      }
    });

    it('sets x, y, width, height attributes on every rect', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parser.parse(svg);
      const rects = Array.isArray(parsed.svg.rect) ? parsed.svg.rect : [parsed.svg.rect];

      for (const rect of rects) {
        expect(rect.x).toBeDefined();
        expect(rect.y).toBeDefined();
        expect(Number(rect.width)).toBe(EXPECTED_PNG_DIMENSIONS.small.casePixels);
        expect(Number(rect.height)).toBe(EXPECTED_PNG_DIMENSIONS.small.casePixels);
      }
    });
  });

  describe('colour accuracy', () => {
    it('maps each Hexahue palette colour to the correct hex colour string', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;

      for (let caseY = 0; caseY < MOCK_ROTATED_GRID_4x6.length; caseY++) {
        for (let caseX = 0; caseX < MOCK_ROTATED_GRID_4x6[caseY].length; caseX++) {
          const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
          const expectedHex = HEXAHUE_PALETTE_MAP[colorName].hex;
          const x = caseX * casePixels;
          const y = caseY * casePixels;
          expect(svg).toContain(`x="${x}" y="${y}" width="${casePixels}" height="${casePixels}" fill="${expectedHex}"`);
        }
      }
    });
  });

  describe('input validation', () => {
    it('throws a RangeError for an empty grid (zero rows)', () => {
      expect(() => renderer.render([], 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for a grid with a zero-length row', () => {
      expect(() => renderer.render([[]], 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for a grid with inconsistent row lengths', () => {
      const raggedGrid: ColorGrid = [
        ['red', 'green'],
        ['blue'],
      ];
      expect(() => renderer.render(raggedGrid, 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for an invalid size value', () => {
      expect(() =>
        renderer.render(MOCK_ROTATED_GRID_4x6, 'huge' as never),
      ).toThrow(RangeError);
    });
  });
});
```

Note: unlike `PngRenderer.render` (`async`, so its guard-clause `RangeError`s surface as rejected Promises), `SvgRenderer.render` is synchronous, so these `RangeError`s throw synchronously and `expect(() => ...).toThrow(RangeError)` (no `await`, no `.rejects`) is the correct pattern here - do not copy `PngRenderer.spec.ts`'s `await expect(...).rejects.toThrow(...)` pattern for this file.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest svg-renderer.spec.ts`
Expected: FAIL with "Cannot find module './svg-renderer'"

- [ ] **Step 4: Implement `SvgRenderer`**

`backend/src/renderer/svg-renderer.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ColorGrid, CaseSize, Renderer } from '../shared/types';
import { getCasePixels, colorNameToHex } from './palette';

/**
 * Renders a fully assembled ColorGrid (header rows already stacked above
 * the message body) to a self-contained SVG string, using native string
 * templating (no DOM library). Each colour case is painted as one <rect>
 * element - there is no metadata header of any kind (see
 * docs/tests/renderer.md, "Design note: no visual header row", for why).
 */
@Injectable()
export class SvgRenderer implements Renderer<string> {
  render(grid: ColorGrid, size: CaseSize): string {
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

    const casePixels = getCasePixels(size);
    const widthPx = gridWidthInCases * casePixels;
    const heightPx = gridHeightInCases * casePixels;

    const rects: string[] = [];
    for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
      for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
        const hex = colorNameToHex(grid[caseY][caseX]);
        const x = caseX * casePixels;
        const y = caseY * casePixels;
        rects.push(
          `<rect x="${x}" y="${y}" width="${casePixels}" height="${casePixels}" fill="${hex}"/>`,
        );
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPx} ${heightPx}" width="${widthPx}" height="${heightPx}">${rects.join('')}</svg>`;
  }
}
```

- [ ] **Step 5: Register `SvgRenderer` in `RendererModule`**

Modify `backend/src/renderer/renderer.module.ts` to:

```typescript
import { Module } from '@nestjs/common';
import { PngRenderer } from './png-renderer';
import { SvgRenderer } from './svg-renderer';

@Module({
  providers: [PngRenderer, SvgRenderer],
  exports: [PngRenderer, SvgRenderer],
})
export class RendererModule {}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest svg-renderer.spec.ts`
Expected: PASS (16 tests: 1 interface compliance + 3 output validity + 4 viewBox + 3 rect elements + 1 colour accuracy + 4 input validation - the 4th input-validation case, invalid size, is not in the doc's literal list but is added here for parity with `PngRenderer`'s equivalent guard).

- [ ] **Step 7: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/renderer`
Expected: all tests pass (269 from Task 1 + 16 new = 285), eslint clean.

- [ ] **Step 8: Sync the test contract doc**

`docs/tests/renderer.md` section 2 already lists the doc-literal bullets this task implements. Append one "Input validation" subsection after "Colour accuracy" in section 2, matching section 1's precedent (PngRenderer already has this exact subsection):

```markdown

**Input validation**
- it throws for an empty grid (zero rows)
- it throws for a grid with a zero-length row
- it throws for a grid with inconsistent row lengths (not rectangular)
- it throws for an invalid size value
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/renderer/svg-renderer.ts backend/src/renderer/renderer.module.ts backend/src/renderer/svg-renderer.spec.ts backend/package.json backend/package-lock.json docs/tests/renderer.md
git commit -m "$(cat <<'EOF'
feat(renderer): implement SvgRenderer with native string templating

Modified files:
- backend/src/renderer/svg-renderer.ts - SvgRenderer implements Renderer<string>, one rect per case, no DOM library
- backend/src/renderer/renderer.module.ts - register SvgRenderer as a provider alongside PngRenderer
- backend/src/renderer/svg-renderer.spec.ts - unit tests: interface compliance, output validity, viewBox (3 sizes), rect elements, colour accuracy, input validation
- backend/package.json, backend/package-lock.json - add fast-xml-parser devDependency (test-only)
- docs/tests/renderer.md - add Input validation subsection to section 2, matching section 1's precedent
EOF
)"
```

---

### Task 3: Integration tests (full pipeline)

**Files:**
- Create: `backend/src/renderer/svg-renderer.integration.spec.ts`

**Interfaces:**
- Consumes: `preprocess` (`backend/src/cipher/preprocess.ts`), `buildGrid` (`backend/src/cipher/build-grid.ts`), `RotationEngine` (`backend/src/rotation/rotation-engine.ts`), `ReadingOrderRegistry` (`backend/src/reading-order/reading-order.registry.ts`), `SvgRenderer` (Task 2), `MOCK_HEXAHUE_ALPHABET` and `EXPECTED_PNG_DIMENSIONS` (existing fixtures from FEAT-009, unchanged).

- [ ] **Step 1: Write the integration tests**

`backend/src/renderer/svg-renderer.integration.spec.ts`:

```typescript
import { XMLParser } from 'fast-xml-parser';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { SvgRenderer } from './svg-renderer';
import {
  MOCK_HEXAHUE_ALPHABET,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/**
 * Runs the full encoding pipeline (preprocess -> buildGrid -> rotate ->
 * render) for a known short message, as required by
 * docs/tests/renderer.md section 3. Same scenario as PngRenderer's
 * integration test (FEAT-009): T=5, LR-TB, index sequence [0,1,2,3]
 * (representing angles 0,90,180,270 - see FEAT-009's plan for why), CW,
 * size medium. No header anywhere in this pipeline - see this file's
 * sibling png-renderer.integration.spec.ts and docs/tests/renderer.md's
 * "Design note: no visual header row" for the rationale.
 */
function encodeAndRender(): string {
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

  const renderer = new SvgRenderer();
  return renderer.render(rotatedGrid, 'medium');
}

describe('SvgRenderer - integration', () => {
  it('encodes the message AB with T=5, LR-TB, sequence [0,90,180,270], CW, size medium and produces an SVG with the correct viewBox', () => {
    const svg = encodeAndRender();
    const parsed = parser.parse(svg);
    const [, , width, height] = parsed.svg.viewBox.split(' ');

    const expectedGridWidthInCases = 10; // widthMultiplier(1) * lcm(pivotBlockSize=5, symbolWidth=2)
    const expectedGridHeightInCases = 5; // ceil(symbolHeight=3 / pivotBlockSize=5) * 5
    expect(Number(width)).toBe(
      expectedGridWidthInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
    expect(Number(height)).toBe(
      expectedGridHeightInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });

  it('encodes the message AB with the same params and produces an SVG with the correct total number of rect elements', () => {
    const svg = encodeAndRender();
    const parsed = parser.parse(svg);
    const rects = Array.isArray(parsed.svg.rect) ? parsed.svg.rect : [parsed.svg.rect];

    const expectedGridWidthInCases = 10;
    const expectedGridHeightInCases = 5;
    expect(rects.length).toBe(expectedGridWidthInCases * expectedGridHeightInCases);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd backend && npx jest svg-renderer.integration.spec.ts`
Expected: PASS (2 tests). These numbers were already verified by hand and independently re-derived by two separate reviewers during FEAT-009's execution for the identical T=5/'AB' scenario - if they fail here, the bug is in this task's test setup, not in the arithmetic (do not adjust `SvgRenderer` to make the numbers match).

- [ ] **Step 3: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: all tests pass (285 from Task 2 + 2 integration = 287 total; no pre-existing test should regress).

- [ ] **Step 4: Commit**

```bash
git add backend/src/renderer/svg-renderer.integration.spec.ts
git commit -m "$(cat <<'EOF'
test(renderer): add SvgRenderer integration tests for the full pipeline

Modified files:
- backend/src/renderer/svg-renderer.integration.spec.ts - preprocess to buildGrid to rotate to render, viewBox and rect-count assertions, same T=5/AB scenario as PngRenderer's integration test
EOF
)"
```

---

## After this plan

FEAT-011 (API `/encode` endpoint) can now inject both `PngRenderer` and `SvgRenderer` from `RendererModule` and call whichever the request asks for - both share the exact same `Renderer<T>` contract, the same `palette.ts` colour/size guards (via `getCasePixels`/`colorNameToHex`, consolidated in this plan's Task 1), and the same "no header" constraint. FEAT-011 still needs its own answer to the open question already on `BACKLOG.md`'s FEAT-012 entry: without a header, message-boundary detection on decode is unresolved - that remains entirely out of scope for both renderers.
