# FEAT-012 Decode API Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/decode`: accepts a cryptogram (PNG or SVG), the key used to encode it, and the case size, inverts the full cipher pipeline (parse image -> undo rotation -> reverse-map symbols to characters), and returns the decoded text. This is the last remaining V1 backend API endpoint.

**Architecture:** Two new pure, synchronous "inverse direction" pieces are added alongside their existing forward-direction siblings for domain symmetry: `renderer/png-parser.ts`/`renderer/svg-parser.ts` (the inverse of `PngRenderer`/`SvgRenderer` - image bytes/string back to a `ColorGrid`) and `cipher/decode-grid.ts` (the inverse of `build-grid.ts` - a `ColorGrid` back to text). `RotationEngine.decode()` already exists (FEAT-007) and needs no changes. `DecodeService`/`DecodeController` orchestrate these pieces, matching `EncodeService`/`EncodeController`'s established shape exactly.

**Tech Stack:** NestJS 11, TypeScript strict, Jest, Sharp (already a dependency, raw pixel reading), `fast-xml-parser` (currently a devDependency from FEAT-010's tests - this plan promotes it to a real dependency since production code now parses SVG at runtime, not just tests).

**Spec:** `docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md` is the design spec this plan implements - read it in full before this plan's Global Constraints, which summarize but do not replace it. `docs/tests/api.md` section 2 (`POST /decode`) is the binding test contract, with one addition this plan makes to it (see Task 4): the doc's bullets predate this plan's design decision to add a required `size` field, and need corresponding "missing/invalid size" validation bullets added. `BACKLOG.md` FEAT-012 is the acceptance-criteria source, reinterpreted per the design spec's "Decision 2" (see below).

## Global Constraints

- TypeScript strict mode, no implicit any.
- English code, comments, commit messages. No em dash, en dash, or curly quotes anywhere - plain ASCII punctuation only (hard house rule; violated repeatedly across FEAT-009 through FEAT-013 on this project, check every file including markdown with extra care).
- Conventional Commits with a mandatory "Modified files:" list on every commit.
- **The request body includes a required `size: 'small' | 'medium' | 'large'` field** - not in `BACKLOG.md`'s original FEAT-012 request shape (which only listed `cryptogram`, `format`, `key`), added deliberately per the design spec's Decision 1: a PNG parser cannot reliably infer `casePixels` from pixel dimensions alone (multiple candidate values can evenly divide the same width/height). This applies uniformly to both `format` values, even though SVG's own `<rect>` `width` attribute is technically self-describing - one consistent request shape, no format-conditional required fields.
- **`POST /decode` returns the FULL decoded grid content, unconditionally - no automatic message/padding boundary detection.** Per the design spec's Decision 2: every symbol block in the grid (message and padding alike) is decoded, with unrecognized blocks (which padding usually, but not always, produces) replaced by the placeholder character `?`. There is no attempt to guess where the real message ends. **This changes what "round-trip" and "recovers the original message" mean for this plan's own tests**: `decodedMessage.startsWith(originalMessage)`, never strict equality, since the decoded output legitimately contains trailing padding-derived content after the real message. Do not "fix" a round-trip test to assert exact equality - that would be reverting the design decision, not fixing a bug.
- **The placeholder character for an unrecognized symbol block is `?`** (plain ASCII).
- **`png-parser.ts`/`svg-parser.ts` are plain exported functions, not NestJS-injectable classes** - unlike `PngRenderer`/`SvgRenderer` (which are classes because they implement the polymorphic `Renderer<T>` interface), there is no equivalent interface requirement here. This matches `cipher/`'s existing plain-function style (`preprocess`, `buildGrid`) rather than introducing an unnecessary DI wrapper for pure data transformation. `DecodeService` imports and calls them directly.
- **PNG colour sampling needs no fuzzy/nearest-colour matching.** `PngRenderer` paints every case as one solid, non-interpolated block (already verified during FEAT-009's final review: 0 pixel mismatches in independent testing), so sampling any single pixel within a case (this plan uses each case's top-left pixel) and doing an EXACT match against the fixed 9-colour palette is sufficient and correct. A pixel that doesn't exactly match any known colour means a genuinely corrupted/non-HexaRot image, not a legitimate rendering to fuzzy-match against.
- **Base64 decoding does not need its own explicit validation step.** `Buffer.from(cryptogram, 'base64')` is lenient in Node.js and does not throw for malformed input - it silently decodes whatever it can. The actual "not valid base64" failure surfaces naturally when Sharp tries to parse the resulting (possibly garbage) buffer as a PNG and throws - `png-parser.ts`'s own try/catch around Sharp's call already covers this, no separate base64-format check is needed or should be added.
- **`fast-xml-parser`'s untyped `parse()` return needs the same typed-cast pattern already established in this codebase** (`svg-renderer.spec.ts`/`svg-renderer.integration.spec.ts`, FEAT-010): local typed interfaces plus an `as` cast at the parse boundary, to satisfy this repo's strict `tseslint.configs.recommendedTypeChecked` config. Do not leave `parser.parse(...)` untyped in production code (`svg-parser.ts`) - this is now PRODUCTION code, not test code, so the same discipline applies with the same fix pattern.
- **`DecodeController.decode()` must return `Promise<DecodeResult>` (the async method's natural return type), not a bare `DecodeResult`.** FEAT-013's final review found a real TypeScript compile error (TS1272) in `KeyController.parse()`, which returns a bare interface type as a decorated method's return type under this project's `isolatedModules`+`emitDecoratorMetadata` config - `EncodeController.encode()`'s `Promise<EncodeResult>` was safe precisely because the emitted decorator metadata only ever references the global `Promise`, never `EncodeResult` itself as a value. `DecodeService.decode()` is naturally `async` (it awaits `parsePng`), so this is not a workaround, just confirming the natural shape avoids the bug - but the task reviewer must explicitly verify with `npx tsc --noEmit` that this task introduces no new TS1272-class error, exactly as FEAT-013's final review had to catch this after three clean task reviews missed it.
- **`DecodeService` needs `HexahueAlphabet` and `RotationEngine` injected (matching `EncodeService`'s constructor shape minus the two renderers) - it does NOT need `PngRenderer`/`SvgRenderer`.** `ApiModule`'s `imports` array needs no changes - `AlphabetModule`/`RotationModule` are already imported there for `EncodeService`'s sake.
- Following the established test-strategy decision from FEAT-011/012/013: `DecodeService`'s own unit tests and the e2e suite use the shared `MockAlphabet` test double (`backend/test/utils/mock-alphabet.ts`, symbolWidth=3/symbolHeight=2, characters A-F), substituted for the real database-backed `HexahueAlphabet` - no real database is touched anywhere in this plan's own tests.
- **The "multi-word message with spaces" round-trip bullet from `docs/tests/api.md` is skipped, per that bullet's own explicit hedge ("if supported by alphabet").** `MockAlphabet` does not support a space character (confirmed during planning: its `getSupportedChars()` returns only `A`-`F`). Do not extend `MockAlphabet` to add space support just for this one bullet - that risks destabilizing every other test that already depends on its exact character set. Note the skip explicitly in the test file with a one-line comment, do not silently omit it.
- The house rule against `for`/`while`/`if` directly inside `it()` test bodies applies (this project's established convention, `it.each` required instead).

---

### Task 1: Image parsing (`png-parser.ts`, `svg-parser.ts`, palette reverse lookups)

**Files:**
- Modify: `backend/src/renderer/palette.ts`
- Modify: `backend/src/renderer/palette.spec.ts`
- Create: `backend/src/renderer/png-parser.ts`
- Test: `backend/src/renderer/png-parser.spec.ts`
- Create: `backend/src/renderer/svg-parser.ts`
- Test: `backend/src/renderer/svg-parser.spec.ts`
- Modify: `backend/package.json` (moves `fast-xml-parser` from `devDependencies` to `dependencies`)

**Interfaces:**
- Produces: `hexToColorName(hex: string): string`, `rgbToColorName(r: number, g: number, b: number): string` (both in `palette.ts`, throw `RangeError` for an unrecognized value, mirroring `colorNameToHex`/`colorNameToRgb`'s existing guard style). `parsePng(buffer: Buffer, casePixels: number): Promise<ColorGrid>`. `parseSvg(svgString: string, casePixels: number): ColorGrid`. All consumed by Task 3's `DecodeService`.

- [ ] **Step 1: Write the failing tests for the palette reverse lookups**

Add to `backend/src/renderer/palette.spec.ts` (append; do not modify any existing test in this file; extend the existing `import { ... } from './palette';` line at the top rather than adding a second import line):

```typescript
describe('hexToColorName', () => {
  it('resolves each of the 9 palette hex values back to its colour name', () => {
    expect(hexToColorName('#ff00ff')).toBe('purple');
    expect(hexToColorName('#ff0000')).toBe('red');
    expect(hexToColorName('#66ff00')).toBe('green');
    expect(hexToColorName('#ffff00')).toBe('yellow');
    expect(hexToColorName('#0000ff')).toBe('blue');
    expect(hexToColorName('#00ffff')).toBe('cyan');
    expect(hexToColorName('#ffffff')).toBe('white');
    expect(hexToColorName('#000000')).toBe('black');
    expect(hexToColorName('#888888')).toBe('gray');
  });

  it('throws a RangeError for a hex value outside the Hexahue palette', () => {
    expect(() => hexToColorName('#123456')).toThrow(RangeError);
  });
});

describe('rgbToColorName', () => {
  it('resolves each of the 9 palette RGB triples back to its colour name', () => {
    expect(rgbToColorName(255, 0, 255)).toBe('purple');
    expect(rgbToColorName(255, 0, 0)).toBe('red');
    expect(rgbToColorName(102, 255, 0)).toBe('green');
    expect(rgbToColorName(255, 255, 0)).toBe('yellow');
    expect(rgbToColorName(0, 0, 255)).toBe('blue');
    expect(rgbToColorName(0, 255, 255)).toBe('cyan');
    expect(rgbToColorName(255, 255, 255)).toBe('white');
    expect(rgbToColorName(0, 0, 0)).toBe('black');
    expect(rgbToColorName(136, 136, 136)).toBe('gray');
  });

  it('throws a RangeError for an RGB triple outside the Hexahue palette', () => {
    expect(() => rgbToColorName(1, 2, 3)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest palette.spec.ts`
Expected: FAIL with "hexToColorName is not a function" / "rgbToColorName is not a function" (existing tests still pass).

- [ ] **Step 3: Implement the palette reverse lookups**

Append to `backend/src/renderer/palette.ts`:

```typescript
/**
 * Resolves a hex colour string back to its Hexahue colour name.
 *
 * @throws {RangeError} If the hex value is not part of the Hexahue palette.
 */
export function hexToColorName(hex: string): string {
  for (const [name, value] of Object.entries(HEXAHUE_COLOR_HEX)) {
    if (value === hex) {
      return name;
    }
  }
  throw new RangeError(
    `Unknown colour hex "${hex}", expected one of: ${Object.values(HEXAHUE_COLOR_HEX).join(', ')}`,
  );
}

/**
 * Resolves an RGB triple back to its Hexahue colour name.
 *
 * @throws {RangeError} If the RGB triple is not part of the Hexahue palette.
 */
export function rgbToColorName(r: number, g: number, b: number): string {
  const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return hexToColorName(hex);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest palette.spec.ts`
Expected: PASS (all existing tests plus 4 new: 2 for `hexToColorName`, 2 for `rgbToColorName`).

- [ ] **Step 5: Install fast-xml-parser as a real dependency and remove it from devDependencies**

Run: `cd backend && npm uninstall --save-dev fast-xml-parser && npm install fast-xml-parser`
Expected: `fast-xml-parser` moves from `devDependencies` to `dependencies` in `backend/package.json`. Confirm the version stays the same (`^5.10.1`) unless npm resolves a newer compatible version - either is fine, just confirm it lands under `dependencies`, not both sections.

- [ ] **Step 6: Write the failing tests for `png-parser.ts`**

`backend/src/renderer/png-parser.spec.ts`:

```typescript
import { PngRenderer } from './png-renderer';
import { parsePng } from './png-parser';
import { MOCK_ROTATED_GRID_4x6, EXPECTED_PNG_DIMENSIONS } from './__fixtures__/renderer.fixtures';

describe('parsePng', () => {
  const renderer = new PngRenderer();

  it.each(['small', 'medium', 'large'] as const)(
    'recovers the original grid from a rendered PNG at size %s',
    async (size) => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, size);
      const casePixels = EXPECTED_PNG_DIMENSIONS[size].casePixels;
      const grid = await parsePng(buffer, casePixels);
      expect(grid).toEqual(MOCK_ROTATED_GRID_4x6);
    },
  );

  it('throws a RangeError for a buffer that is not a valid PNG', async () => {
    const garbage = Buffer.from('not a png image', 'utf-8');
    await expect(parsePng(garbage, 8)).rejects.toThrow(RangeError);
  });

  it('throws a RangeError when image dimensions are not exact multiples of casePixels', async () => {
    const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    await expect(parsePng(buffer, 7)).rejects.toThrow(RangeError);
  });
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd backend && npx jest png-parser.spec.ts`
Expected: FAIL with "Cannot find module './png-parser'"

- [ ] **Step 8: Implement `png-parser.ts`**

`backend/src/renderer/png-parser.ts`:

```typescript
import sharp from 'sharp';
import { ColorGrid } from '../shared/types';
import { rgbToColorName } from './palette';

/**
 * Parses a PNG buffer (produced by PngRenderer) back into a ColorGrid.
 * Samples each case's top-left pixel - every pixel within a case is
 * identical by construction (PngRenderer paints solid, non-interpolated
 * blocks) - and matches it exactly against the fixed Hexahue palette.
 *
 * @throws {RangeError} If the buffer is not a valid image, or its
 *   dimensions are not exact multiples of casePixels.
 */
export async function parsePng(
  buffer: Buffer,
  casePixels: number,
): Promise<ColorGrid> {
  let data: Buffer;
  let width: number;
  let height: number;
  let channels: number;

  try {
    const raw = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    data = raw.data;
    width = raw.info.width;
    height = raw.info.height;
    channels = raw.info.channels;
  } catch (err) {
    throw new RangeError(`Invalid PNG image: ${(err as Error).message}`);
  }

  if (width % casePixels !== 0 || height % casePixels !== 0) {
    throw new RangeError(
      `Image dimensions ${width}x${height} are not exact multiples of casePixels=${casePixels}`,
    );
  }

  const gridWidthInCases = width / casePixels;
  const gridHeightInCases = height / casePixels;

  const grid: ColorGrid = [];
  for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
    const row: string[] = [];
    for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
      const px = caseX * casePixels;
      const py = caseY * casePixels;
      const offset = (py * width + px) * channels;
      row.push(rgbToColorName(data[offset], data[offset + 1], data[offset + 2]));
    }
    grid.push(row);
  }

  return grid;
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd backend && npx jest png-parser.spec.ts`
Expected: PASS (5 tests: 3 from the `it.each` over sizes, plus 2 error cases).

- [ ] **Step 10: Write the failing tests for `svg-parser.ts`**

`backend/src/renderer/svg-parser.spec.ts`:

```typescript
import { SvgRenderer } from './svg-renderer';
import { parseSvg } from './svg-parser';
import { MOCK_ROTATED_GRID_4x6, EXPECTED_PNG_DIMENSIONS } from './__fixtures__/renderer.fixtures';

describe('parseSvg', () => {
  const renderer = new SvgRenderer();

  it.each(['small', 'medium', 'large'] as const)(
    'recovers the original grid from a rendered SVG at size %s',
    (size) => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, size);
      const casePixels = EXPECTED_PNG_DIMENSIONS[size].casePixels;
      const grid = parseSvg(svg, casePixels);
      expect(grid).toEqual(MOCK_ROTATED_GRID_4x6);
    },
  );

  it('throws a RangeError for a string that is not valid SVG', () => {
    expect(() => parseSvg('not svg at all', 8)).toThrow(RangeError);
  });

  it('throws a RangeError when a rect width does not match the expected casePixels', () => {
    const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    expect(() => parseSvg(svg, 16)).toThrow(RangeError);
  });
});
```

- [ ] **Step 11: Run tests to verify they fail**

Run: `cd backend && npx jest svg-parser.spec.ts`
Expected: FAIL with "Cannot find module './svg-parser'"

- [ ] **Step 12: Implement `svg-parser.ts`**

`backend/src/renderer/svg-parser.ts`:

```typescript
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ColorGrid } from '../shared/types';
import { hexToColorName } from './palette';

interface ParsedSvgRect {
  x: string | number;
  y: string | number;
  width: string | number;
  fill: string;
}

interface ParsedSvgDocument {
  svg?: {
    rect?: ParsedSvgRect | ParsedSvgRect[];
  };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/**
 * Parses an SVG string (produced by SvgRenderer) back into a ColorGrid.
 * Self-describing: each <rect>'s own x/y/width attributes give its exact
 * case position and size, no assumption about image dimensions needed
 * beyond the expected casePixels itself.
 *
 * @throws {RangeError} If the string is not well-formed SVG, has no rect
 *   elements, a rect's width does not match casePixels, or the rects do
 *   not tile a complete rectangular grid with no gaps.
 */
export function parseSvg(svgString: string, casePixels: number): ColorGrid {
  const validation = XMLValidator.validate(svgString);
  if (validation !== true) {
    throw new RangeError(
      `Invalid SVG: ${validation.err.msg} at line ${validation.err.line}`,
    );
  }

  const parsed = parser.parse(svgString) as ParsedSvgDocument;
  const rectsRaw = parsed.svg?.rect;
  if (!rectsRaw) {
    throw new RangeError('Invalid SVG: no rect elements found');
  }
  const rects = Array.isArray(rectsRaw) ? rectsRaw : [rectsRaw];

  const cells = new Map<string, string>();
  let maxCaseX = 0;
  let maxCaseY = 0;

  for (const rect of rects) {
    const x = Number(rect.x);
    const y = Number(rect.y);
    const width = Number(rect.width);

    if (width !== casePixels) {
      throw new RangeError(
        `rect width ${width} does not match expected casePixels=${casePixels}`,
      );
    }
    if (x % casePixels !== 0 || y % casePixels !== 0) {
      throw new RangeError(
        `rect at (${x},${y}) is not aligned to casePixels=${casePixels}`,
      );
    }

    const caseX = x / casePixels;
    const caseY = y / casePixels;
    maxCaseX = Math.max(maxCaseX, caseX);
    maxCaseY = Math.max(maxCaseY, caseY);
    cells.set(`${caseX},${caseY}`, hexToColorName(rect.fill));
  }

  const gridWidthInCases = maxCaseX + 1;
  const gridHeightInCases = maxCaseY + 1;

  const grid: ColorGrid = [];
  for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
    const row: string[] = [];
    for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
      const color = cells.get(`${caseX},${caseY}`);
      if (color === undefined) {
        throw new RangeError(`Missing rect for case (${caseX},${caseY})`);
      }
      row.push(color);
    }
    grid.push(row);
  }

  return grid;
}
```

- [ ] **Step 13: Run tests to verify they pass**

Run: `cd backend && npx jest svg-parser.spec.ts`
Expected: PASS (5 tests: 3 from the `it.each` over sizes, plus 2 error cases).

- [ ] **Step 14: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/renderer`
Expected: all tests pass (338 baseline + 4 palette + 5 png-parser + 5 svg-parser = 352), eslint clean.

- [ ] **Step 15: Commit**

```bash
git add backend/src/renderer/palette.ts backend/src/renderer/palette.spec.ts backend/src/renderer/png-parser.ts backend/src/renderer/png-parser.spec.ts backend/src/renderer/svg-parser.ts backend/src/renderer/svg-parser.spec.ts backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
feat(renderer): add PNG and SVG parsers, inverse of PngRenderer/SvgRenderer

Modified files:
- backend/src/renderer/palette.ts - add hexToColorName and rgbToColorName reverse lookups
- backend/src/renderer/palette.spec.ts - tests for both new reverse lookups
- backend/src/renderer/png-parser.ts - parsePng: PNG buffer to ColorGrid via exact pixel-colour matching
- backend/src/renderer/png-parser.spec.ts - round-trip tests against PngRenderer at all 3 sizes, error cases
- backend/src/renderer/svg-parser.ts - parseSvg: SVG string to ColorGrid via self-describing rect coordinates
- backend/src/renderer/svg-parser.spec.ts - round-trip tests against SvgRenderer at all 3 sizes, error cases
- backend/package.json, backend/package-lock.json - move fast-xml-parser from devDependencies to dependencies
EOF
)"
```

---

### Task 2: Grid-to-text decoding

**Files:**
- Create: `backend/src/cipher/decode-grid.ts`
- Test: `backend/src/cipher/decode-grid.spec.ts`

**Interfaces:**
- Consumes: `VisualAlphabet`, `ColorGrid` (from `shared/types`).
- Produces: `decodeGrid(grid: ColorGrid, alphabet: VisualAlphabet): string`, consumed by Task 3's `DecodeService`.

- [ ] **Step 1: Write the failing tests**

`backend/src/cipher/decode-grid.spec.ts`:

```typescript
import { ColorGrid } from '../shared/types';
import { decodeGrid } from './decode-grid';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

describe('decodeGrid', () => {
  const alphabet = new MockAlphabet();

  it('decodes a grid containing only known symbols back to the original characters', () => {
    // MockAlphabet: symbolWidth=3, symbolHeight=2. 'A' block:
    // [['red','green','blue'],['yellow','purple','cyan']]
    // 'B' block:
    // [['green','blue','red'],['purple','cyan','yellow']]
    const grid: ColorGrid = [
      ['red', 'green', 'blue', 'green', 'blue', 'red'],
      ['yellow', 'purple', 'cyan', 'purple', 'cyan', 'yellow'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('AB');
  });

  it('replaces an unrecognized block with the placeholder character', () => {
    const grid: ColorGrid = [
      ['red', 'green', 'blue', 'black', 'black', 'black'],
      ['yellow', 'purple', 'cyan', 'black', 'black', 'black'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('A?');
  });

  it('decodes an all-padding grid (no recognizable blocks) to all placeholders', () => {
    const grid: ColorGrid = [
      ['black', 'black', 'black', 'white', 'white', 'white'],
      ['black', 'black', 'black', 'white', 'white', 'white'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('??');
  });

  it('reads symbols in row-major order across multiple symbol rows', () => {
    // Two symbol rows of one symbol each (grid is 3 wide, 4 tall = 2 symbol rows)
    const grid: ColorGrid = [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
      ['green', 'blue', 'red'],
      ['purple', 'cyan', 'yellow'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('AB');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest decode-grid.spec.ts`
Expected: FAIL with "Cannot find module './decode-grid'"

- [ ] **Step 3: Implement `decode-grid.ts`**

`backend/src/cipher/decode-grid.ts`:

```typescript
import { VisualAlphabet, ColorGrid } from '../shared/types';

/** Placeholder for a symbol block that matches no known character. */
export const UNRECOGNIZED_PLACEHOLDER = '?';

/** Builds a reverse lookup: stringified colour-grid block -> character. */
function buildReverseLookup(alphabet: VisualAlphabet): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const char of alphabet.getSupportedChars()) {
    const block = alphabet.getBlock(char);
    lookup.set(JSON.stringify(block), char);
  }
  return lookup;
}

/**
 * Decodes a ColorGrid back into text, reading symbol blocks in the same
 * row-major order buildGrid used to place them. Every block is decoded
 * unconditionally - there is no attempt to determine where the real
 * message ends and random padding begins (see
 * docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md,
 * "Decision 2"). A block that matches no known character becomes
 * UNRECOGNIZED_PLACEHOLDER.
 */
export function decodeGrid(grid: ColorGrid, alphabet: VisualAlphabet): string {
  const { symbolWidth, symbolHeight } = alphabet;
  const gridHeightInCases = grid.length;
  const gridWidthInCases = gridHeightInCases > 0 ? grid[0].length : 0;

  const symbolsPerRow = Math.floor(gridWidthInCases / symbolWidth);
  const symbolRows = Math.floor(gridHeightInCases / symbolHeight);

  const reverseLookup = buildReverseLookup(alphabet);
  let result = '';

  for (let row = 0; row < symbolRows; row++) {
    for (let col = 0; col < symbolsPerRow; col++) {
      const baseY = row * symbolHeight;
      const baseX = col * symbolWidth;
      const block: ColorGrid = [];
      for (let dy = 0; dy < symbolHeight; dy++) {
        block.push(grid[baseY + dy].slice(baseX, baseX + symbolWidth));
      }
      result += reverseLookup.get(JSON.stringify(block)) ?? UNRECOGNIZED_PLACEHOLDER;
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest decode-grid.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full backend suite and lint**

Run: `cd backend && npm run test && npx eslint src/cipher`
Expected: all tests pass (352 baseline + 4 new = 356), eslint clean.

- [ ] **Step 6: Commit**

```bash
git add backend/src/cipher/decode-grid.ts backend/src/cipher/decode-grid.spec.ts
git commit -m "$(cat <<'EOF'
feat(cipher): add decodeGrid, the inverse of buildGrid

Modified files:
- backend/src/cipher/decode-grid.ts - decodeGrid: reads symbol blocks in buildGrid's row-major order, reverse-maps to characters via the alphabet, unrecognized blocks become the ? placeholder, no message-boundary detection attempted
- backend/src/cipher/decode-grid.spec.ts - tests for full recognition, partial recognition, all-padding, and multi-row reading order
EOF
)"
```

---

### Task 3: `DecodeService`, `DecodeController`, and the request DTO

**Files:**
- Create: `backend/src/api/dto/decode-request.dto.ts`
- Create: `backend/src/api/decode.service.ts`
- Test: `backend/src/api/decode.service.spec.ts`
- Create: `backend/src/api/decode.controller.ts`
- Modify: `backend/src/api/api.module.ts`

**Interfaces:**
- Consumes: `KeyCodec`, `KeyParams` (Task-1-independent, already shipped, FEAT-004/013); `HexahueAlphabet` (FEAT-001); `RotationEngine` (FEAT-007, its already-existing `decode()` method); `getCasePixels` (`renderer/palette.ts`); `parsePng`, `parseSvg` (Task 1, already committed); `decodeGrid` (Task 2, already committed).
- Produces: `DecodeRequestDto`, `DecodeService` (method `decode(dto): Promise<DecodeResult>`), `DecodeResult` interface, `DecodeController` (`POST /decode`, `@HttpCode(200)`), all consumed by Task 4's e2e suite. `ApiModule` registers `DecodeController`/`DecodeService` alongside the existing `Encode*`/`Key*` pairs.

- [ ] **Step 1: Write the failing tests**

`backend/src/api/decode.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { DecodeService } from './decode.service';
import { EncodeService } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';
import { DecodeRequestDto } from './dto/decode-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';
import { KeyCodec } from '../key/key-codec';

function makeServices() {
  const alphabet = new MockAlphabet();
  const rotationEngine = new RotationEngine(new ReadingOrderRegistry());
  const encodeService = new EncodeService(
    alphabet as unknown as HexahueAlphabet,
    rotationEngine,
    new PngRenderer(),
    new SvgRenderer(),
  );
  const decodeService = new DecodeService(
    alphabet as unknown as HexahueAlphabet,
    rotationEngine,
  );
  return { encodeService, decodeService };
}

const BASE_ENCODE_DTO: EncodeRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
  size: 'medium',
} as EncodeRequestDto;

describe('DecodeService', () => {
  describe('round-trip', () => {
    it('decodes a PNG cryptogram produced by encoding and recovers the original message as a prefix', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);

      const decodeDto: DecodeRequestDto = {
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'medium',
      } as DecodeRequestDto;

      const result = await decodeService.decode(decodeDto);
      expect(result.message.startsWith('ABC')).toBe(true);
    });

    it('decodes an SVG cryptogram produced by encoding and recovers the original message as a prefix', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);

      const decodeDto: DecodeRequestDto = {
        cryptogram: encoded.svg,
        format: 'svg',
        key: encoded.key,
        size: 'medium',
      } as DecodeRequestDto;

      const result = await decodeService.decode(decodeDto);
      expect(result.message.startsWith('ABC')).toBe(true);
    });

    it.each(['LR-TB', 'RL-TB', 'TB-LR', 'BT-LR'] as const)(
      'recovers the message for reading order %s',
      async (readingOrder) => {
        const { encodeService, decodeService } = makeServices();
        const encoded = await encodeService.encode({
          ...BASE_ENCODE_DTO,
          readingOrder,
        });
        const result = await decodeService.decode({
          cryptogram: encoded.png,
          format: 'png',
          key: encoded.key,
          size: 'medium',
        } as DecodeRequestDto);
        expect(result.message.startsWith('ABC')).toBe(true);
      },
    );

    it.each(['cw', 'ccw'] as const)(
      'recovers the message for rotation direction %s',
      async (rotationDirection) => {
        const { encodeService, decodeService } = makeServices();
        const encoded = await encodeService.encode({
          ...BASE_ENCODE_DTO,
          rotationDirection,
        });
        const result = await decodeService.decode({
          cryptogram: encoded.png,
          format: 'png',
          key: encoded.key,
          size: 'medium',
        } as DecodeRequestDto);
        expect(result.message.startsWith('ABC')).toBe(true);
      },
    );
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', async () => {
      const { decodeService } = makeServices();
      const dto = {
        cryptogram: 'irrelevant',
        format: 'png',
        key: 'not-a-key',
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the PNG cryptogram is not a valid image', async () => {
      const { decodeService } = makeServices();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: Buffer.from('not a png', 'utf-8').toString('base64'),
        format: 'png',
        key,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the SVG cryptogram is not valid SVG', async () => {
      const { decodeService } = makeServices();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: 'not svg at all',
        format: 'svg',
        key,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when grid dimensions are inconsistent with the key pivotBlockSize', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);
      const mismatchedKey = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 7,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: encoded.png,
        format: 'png',
        key: mismatchedKey,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
```

Note: this file follows `encode.service.spec.ts`'s established construction pattern exactly (real `RotationEngine`/`PngRenderer`/`SvgRenderer` instances, `MockAlphabet` substituted for `HexahueAlphabet`) - if that file needs a `jest.mock('../prisma/prisma.service', ...)` block for Prisma's ESM client to load correctly under ts-jest (it does, as of FEAT-011's Task 2), add the identical block to the top of this file too.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest decode.service.spec.ts`
Expected: FAIL with "Cannot find module './decode.service'" (and `'./dto/decode-request.dto'`)

- [ ] **Step 3: Implement `DecodeRequestDto`**

`backend/src/api/dto/decode-request.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

/** Request body for POST /decode. */
export class DecodeRequestDto {
  @IsString()
  @IsNotEmpty()
  cryptogram!: string;

  @IsIn(['png', 'svg'])
  format!: 'png' | 'svg';

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsIn(['small', 'medium', 'large'])
  size!: 'small' | 'medium' | 'large';
}
```

- [ ] **Step 4: Implement `DecodeService`**

`backend/src/api/decode.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyCodec, KeyParams } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { RotationEngine } from '../rotation/rotation-engine';
import { getCasePixels } from '../renderer/palette';
import { parsePng } from '../renderer/png-parser';
import { parseSvg } from '../renderer/svg-parser';
import { decodeGrid } from '../cipher/decode-grid';
import { ColorGrid } from '../shared/types';
import { DecodeRequestDto } from './dto/decode-request.dto';

/** Response shape for POST /decode. */
export interface DecodeResult {
  message: string;
}

@Injectable()
export class DecodeService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
  ) {}

  async decode(dto: DecodeRequestDto): Promise<DecodeResult> {
    let keyParams: KeyParams;
    try {
      keyParams = KeyCodec.decode(dto.key);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const casePixels = getCasePixels(dto.size);

    let grid: ColorGrid;
    try {
      grid =
        dto.format === 'png'
          ? await parsePng(Buffer.from(dto.cryptogram, 'base64'), casePixels)
          : parseSvg(dto.cryptogram, casePixels);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const gridHeightInCases = grid.length;
    const gridWidthInCases = gridHeightInCases > 0 ? grid[0].length : 0;
    if (
      gridWidthInCases % keyParams.pivotBlockSize !== 0 ||
      gridHeightInCases % keyParams.pivotBlockSize !== 0
    ) {
      throw new BadRequestException(
        `Grid dimensions ${gridWidthInCases}x${gridHeightInCases} are not consistent with pivotBlockSize=${keyParams.pivotBlockSize} from the given key`,
      );
    }

    const unrotated = this.rotationEngine.decode(
      grid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    const message = decodeGrid(unrotated, this.alphabet);
    return { message };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest decode.service.spec.ts`
Expected: PASS (12 tests: 2 named round-trip + 4 reading-order `it.each` + 2 direction `it.each` + 4 named error cases - recount precisely against the actual test file, do not trust this parenthetical without verifying).

- [ ] **Step 6: Implement `DecodeController`**

`backend/src/api/decode.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { DecodeService } from './decode.service';
import type { DecodeResult } from './decode.service';
import { DecodeRequestDto } from './dto/decode-request.dto';

/**
 * Decodes a HexaRot cryptogram (PNG or SVG) back into text, given the key
 * it was encoded with. Inverts the full pipeline: parse image, undo
 * rotation, reverse-map symbols to characters. Returns the full decoded
 * grid content with no automatic message/padding boundary detection - see
 * docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md.
 */
@Controller('decode')
export class DecodeController {
  constructor(private readonly decodeService: DecodeService) {}

  /**
   * @param dto - cryptogram, format, key, and case size.
   * @returns The decoded message (may include trailing padding-derived content).
   */
  @Post()
  @HttpCode(200)
  async decode(@Body() dto: DecodeRequestDto): Promise<DecodeResult> {
    return this.decodeService.decode(dto);
  }
}
```

Note: `DecodeResult` is imported as a type-only import here even though `decode()`'s return type is `Promise<DecodeResult>` (which FEAT-013's final review found does NOT trigger the TS1272 compile error `KeyController.parse()`'s bare `KeyParseResult` return type did) - this is a defensive choice, not strictly required by the TS1272 mechanism, but costs nothing and removes any doubt. `DecodeService` itself stays a value import (injected constructor dependency).

- [ ] **Step 7: Wire `ApiModule`**

Modify `backend/src/api/api.module.ts` to add `DecodeController`/`DecodeService` alongside the existing `Encode*`/`Key*` pairs (do not remove or reorder existing entries):

```typescript
import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';
import { KeyController } from './key.controller';
import { KeyService } from './key.service';
import { DecodeController } from './decode.controller';
import { DecodeService } from './decode.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [EncodeController, KeyController, DecodeController],
  providers: [EncodeService, KeyService, DecodeService],
})
export class ApiModule {}
```

- [ ] **Step 8: Run the full backend suite, typecheck, and lint**

Run: `cd backend && npm run test && npx tsc --noEmit && npx eslint src/api`
Expected: all tests pass (356 baseline + 12 from `decode.service.spec.ts` = 368). `npx tsc --noEmit` shows no NEW errors attributable to this task's files (`decode.controller.ts`, `decode.service.ts`, `dto/decode-request.dto.ts`, `api.module.ts`) - pre-existing errors elsewhere in the codebase are not this task's concern, but explicitly confirm none of THIS task's own files appear in the error output, given FEAT-013's final review found exactly this class of bug slipping through three clean task reviews. eslint clean.

- [ ] **Step 9: Commit**

```bash
git add backend/src/api/dto/decode-request.dto.ts backend/src/api/decode.service.ts backend/src/api/decode.service.spec.ts backend/src/api/decode.controller.ts backend/src/api/api.module.ts
git commit -m "$(cat <<'EOF'
feat(api): implement DecodeService and DecodeController for POST /decode

Modified files:
- backend/src/api/dto/decode-request.dto.ts - cryptogram, format, key, size all required
- backend/src/api/decode.service.ts - orchestrates key decode, image parsing, rotation inverse, grid-to-text decoding
- backend/src/api/decode.service.spec.ts - round-trip tests (png/svg, all reading orders, both directions) and error mapping tests
- backend/src/api/decode.controller.ts - POST /decode, HttpCode(200), type-only DecodeResult import
- backend/src/api/api.module.ts - register DecodeController/DecodeService alongside the existing Encode/Key pairs
EOF
)"
```

---

### Task 4: Full HTTP e2e test suite and test-contract sync

**Files:**
- Create: `backend/test/decode.e2e-spec.ts`
- Modify: `docs/tests/api.md`

**Interfaces:**
- Consumes: `ApiModule` (Task 3, already committed), `HexahueAlphabet`, `MockAlphabet`.

- [ ] **Step 1: Write the e2e tests**

`backend/test/decode.e2e-spec.ts`:

```typescript
jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { HexahueAlphabet } from '../src/alphabet/hexahue-alphabet.service';
import { MockAlphabet } from './utils/mock-alphabet';
import { DecodeResult } from '../src/api/decode.service';
import { EncodeResult } from '../src/api/encode.service';

interface EncodeResponseBody extends EncodeResult {}
interface DecodeResponseBody extends DecodeResult {}

const BASE_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
  size: 'medium',
};

describe('POST /api/decode (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(HexahueAlphabet)
      .useValue(new MockAlphabet())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function encode(body: Record<string, unknown>): Promise<EncodeResponseBody> {
    const res = await request(app.getHttpServer()).post('/api/encode').send(body);
    return res.body as EncodeResponseBody;
  }

  describe('round-trip', () => {
    it('decodes a PNG cryptogram produced by POST /encode and recovers the original message', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key, size: 'medium' });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('ABC')).toBe(true);
    });

    it('decodes an SVG cryptogram produced by POST /encode and recovers the original message', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.svg, format: 'svg', key: encoded.key, size: 'medium' });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('ABC')).toBe(true);
    });

    it.each(['LR-TB', 'RL-TB', 'TB-LR', 'BT-LR'])(
      'recovers the message for reading order %s',
      async (readingOrder) => {
        const encoded = await encode({ ...BASE_ENCODE_BODY, readingOrder });
        const res = await request(app.getHttpServer())
          .post('/api/decode')
          .send({ cryptogram: encoded.png, format: 'png', key: encoded.key, size: 'medium' });

        expect(res.status).toBe(200);
        const body = res.body as DecodeResponseBody;
        expect(body.message.startsWith('ABC')).toBe(true);
      },
    );

    it.each(['cw', 'ccw'])(
      'recovers the message for rotation direction %s',
      async (rotationDirection) => {
        const encoded = await encode({ ...BASE_ENCODE_BODY, rotationDirection });
        const res = await request(app.getHttpServer())
          .post('/api/decode')
          .send({ cryptogram: encoded.png, format: 'png', key: encoded.key, size: 'medium' });

        expect(res.status).toBe(200);
        const body = res.body as DecodeResponseBody;
        expect(body.message.startsWith('ABC')).toBe(true);
      },
    );

    // "multi-word message with spaces" (docs/tests/api.md) is skipped: MockAlphabet
    // does not support a space character, and that bullet's own wording explicitly
    // hedges with "if supported by alphabet".
  });

  describe('validation errors', () => {
    it('returns 400 when cryptogram is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ format: 'png', key: 'HR1.0000', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'irrelevant', format: 'png', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is malformed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'irrelevant', format: 'png', key: 'not-a-key', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when format is not png or svg', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'irrelevant', format: 'gif', key: 'HR1.0000', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid base64 for PNG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'not a png at all', format: 'png', key: encoded.key, size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid SVG for SVG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'not svg at all', format: 'svg', key: encoded.key, size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is missing', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is not small, medium, or large', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key, size: 'huge' });
      expect(res.status).toBe(400);
    });
  });
});
```

- [ ] **Step 2: Run e2e tests to verify they pass**

Run: `cd backend && npm run test:e2e`
Expected: PASS. Count precisely from the actual file: `round-trip` (2 named + 4 reading-order `it.each` + 2 direction `it.each` = 8) + `validation errors` (8 named) = 16 new tests in this file, plus the existing 55 (app 1 + encode 28 + key 26) = 71 total across all e2e suites. Recount precisely against the actual files before reporting - do not guess.

- [ ] **Step 3: Sync `docs/tests/api.md` section 2 with the shipped test suite**

Section 2 (`POST /decode`) currently has no bullets for the `size` field, since it predates this plan's Decision 1. Add a new subsection after the existing "Validation errors" bullets:

```markdown

**Size validation**
- it returns 400 when `size` is missing
- it returns 400 when `size` is not 'small', 'medium', or 'large'
```

Also add one line under the doc's top-level intro (or wherever `POST /decode`'s request body is described elsewhere in the project - check `BACKLOG.md`'s FEAT-012 entry too, and update its own request-body list there to add `size: 'small' | 'medium' | 'large'` alongside `cryptogram`, `format`, `key`, since that entry currently doesn't list it either).

- [ ] **Step 4: Run the full backend suite (both runners), typecheck, and lint**

Run: `cd backend && npm run test && npm run test:e2e && npx tsc --noEmit && npx eslint test`
Expected: `npm run test` unchanged from Task 3's final count. `npm run test:e2e` passes per Step 2. `npx tsc --noEmit` shows no new errors from `decode.e2e-spec.ts`. eslint clean.

- [ ] **Step 5: Commit**

```bash
git add backend/test/decode.e2e-spec.ts docs/tests/api.md BACKLOG.md
git commit -m "$(cat <<'EOF'
test(api): add full HTTP-level test suite for POST /decode

Modified files:
- backend/test/decode.e2e-spec.ts - round-trip tests (PNG, SVG, all reading orders, both directions) and validation error tests over the real HTTP stack, mocked alphabet, no real database
- docs/tests/api.md - add size validation bullets to section 2, matching the shipped suite
- BACKLOG.md - add the missing size field to FEAT-012's documented request body
EOF
)"
```

---

## After this plan

With `POST /encode`, `POST /key/generate`, `GET /key/parse`, and `POST /decode` all shipped, the V1 backend API surface is complete. `KeyCodec.encode()` still lacks a symmetric `pivotBlockSize` range guard (FEAT-013's final review flagged this as Minor, not fixed there) - worth picking up whenever `key-codec.ts` is next touched, not urgent. The message-boundary-detection question remains open by design (Decision 2) - a future "evolution" could revisit it, but nothing in this plan or its successors needs to solve it. Frontend work (FEAT-014+) can now consume a functionally complete backend.
