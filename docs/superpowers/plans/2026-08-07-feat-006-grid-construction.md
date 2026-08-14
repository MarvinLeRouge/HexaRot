# FEAT-006 - Grid Construction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `buildGrid(processedString, alphabet, pivotBlockSize)`, which lays a pre-processed message out symbol by symbol into a colour-case grid sized to be a multiple of both the pivot block size and the alphabet's symbol dimensions, then fills every remaining case with random padding drawn from the alphabet's own colour palette.

**Architecture:** A single pure function in the `cipher` module. Grid width in cases is an integer multiple of `lcm(pivotBlockSize, symbolWidth)` (the base unit satisfying both the block-alignment and symbol-alignment constraints at once), scaled up to keep the grid roughly square for the actual message length rather than fixed at that base unit; symbols are laid out row-major (left to right, top to bottom) at the resulting width. Grid height in cases is the number of symbol-rows needed, rounded up to the next multiple of `pivotBlockSize`. This is unrelated to `ReadingOrderStrategy` (FEAT-005) - reading order governs which pivot block gets which *rotation* later (FEAT-007); symbol layout here is always the same row-major raster, per the backlog description ("lay out symbols row by row") and `CONTEXT.md`'s architecture section. See Task 3 below for the adaptive-width derivation.

**Tech Stack:** TypeScript (strict), Jest + ts-jest.

**Spec:** `BACKLOG.md` (`FEAT-006`) and `docs/tests/cipher.md` section 4 ("Grid construction (FEAT-006)") - read both before touching code. The fixtures section of that doc also applies.

## Global Constraints

- TypeScript strict mode, no implicit any.
- Code, comments, commit messages: English. Comments only where the WHY isn't obvious from the code.
- Functions verb-first, camelCase; files kebab-case.
- No em dash, en dash used as a hyphen, or curly quotes anywhere written - code, comments, or commit messages. Plain hyphen `-` only.
- Conventional Commits format, with the mandatory "Modified files:" list.
- Branch: `feat/FEAT-006-grid-construction`, created from up-to-date `main`.
- `docs/tests/index.md` section 4 governs every test in this plan: each `it` body must be a single flat assertion path - no `for`/`while`/`if` control-flow statements written directly inside an `it` callback. A well-named helper function that itself loops (defined once in the fixtures file, called as a single line from within an `it`) is acceptable - this project's established reading, confirmed across two rounds of review on the FEAT-005 branch. `.map()`/`.filter()`/`.every()` functional expressions used inline are also acceptable (they compute a value, they don't branch the assertion).
- `docs/tests/cipher.md`'s `buildGrid` tests use `MockAlphabet` (`symbolWidth: 3`, `symbolHeight: 2`, characters A-F), imported from `backend/test/utils/mock-alphabet` (relocated there in a prior branch to match this doc's own stated path - see `backend/src/cipher/preprocess.spec.ts` for the existing import pattern: `import { MockAlphabet } from '../../test/utils/mock-alphabet';`).
- `buildGrid` receives an *already pre-processed* string (see `backend/src/cipher/preprocess.ts` - `PreprocessResult.text` is exactly this). It does not re-validate or re-filter its input; every character is assumed resolvable via `alphabet.getBlock`.
- Reuse the existing `gcd` function exported from `backend/src/validation/validate-params.ts` rather than redefining it - `import { gcd } from '../validation/validate-params';`.
- `ColorGrid` (`string[][]`, indexed `grid[row][col]`) and `VisualAlphabet` are both exported from the `backend/src/shared/types` barrel - import from there, not the individual files.

---

## File Structure

- Create: `backend/src/cipher/__fixtures__/cipher.fixtures.ts` - `VALID_PIVOT_SIZES`, `WEAK_PIVOT_SIZES_MOCK`, `SAMPLE_MESSAGES`, `MOCK_ALPHABET_PALETTE` (per `docs/tests/cipher.md`'s Fixtures section), plus two test-support helpers this plan adds beyond that section's literal list: `extractRegion` and `expectPaddingOnlyAfterMessage`.
- Create: `backend/src/cipher/build-grid.ts` - the `buildGrid` function (only export; `lcm` and `getPalette` are private helpers).
- Create: `backend/src/cipher/build-grid.spec.ts` - the 13 tests matching `docs/tests/cipher.md` section 4's `describe('buildGrid')` bullets one-to-one.

No existing files are modified.

---

### Task 1: Cipher fixtures file

**Files:**
- Create: `backend/src/cipher/__fixtures__/cipher.fixtures.ts`

**Interfaces:**
- Consumes: `VisualAlphabet`, `ColorGrid` from `../../shared/types`.
- Produces: `VALID_PIVOT_SIZES: number[]`, `WEAK_PIVOT_SIZES_MOCK: number[]`, `SAMPLE_MESSAGES: { allSupportedChars: string; empty: string; singleChar: string; withUnsupportedChars: string }`, `MOCK_ALPHABET_PALETTE: string[]`, `extractRegion(grid: ColorGrid, x: number, y: number, width: number, height: number): ColorGrid`, `expectPaddingOnlyAfterMessage(grid: ColorGrid, message: string, alphabet: VisualAlphabet, palette: string[]): void`.

- [x] **Step 1: Create the fixtures file**

```typescript
// backend/src/cipher/__fixtures__/cipher.fixtures.ts
import { VisualAlphabet, ColorGrid } from '../../shared/types';

/** Pivot block sizes coprime with MockAlphabet's dimensions (3x2). */
export const VALID_PIVOT_SIZES = [5, 7, 11];

/** Pivot block sizes that share a factor with MockAlphabet's dimensions (3x2). */
export const WEAK_PIVOT_SIZES_MOCK = [2, 3, 6];

/** Sample messages using MockAlphabet's character set (A-F). */
export const SAMPLE_MESSAGES = {
  allSupportedChars: 'ABCDEF',
  empty: '',
  singleChar: 'A',
  withUnsupportedChars: 'ABXYZ',
};

/** The six colour values used across MockAlphabet's symbols. */
export const MOCK_ALPHABET_PALETTE = [
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'cyan',
];

/** Extracts a widthxheight sub-grid of cases starting at (x, y). */
export function extractRegion(
  grid: ColorGrid,
  x: number,
  y: number,
  width: number,
  height: number,
): ColorGrid {
  const region: ColorGrid = [];
  for (let dy = 0; dy < height; dy++) {
    const row: string[] = [];
    for (let dx = 0; dx < width; dx++) {
      row.push(grid[y + dy][x + dx]);
    }
    region.push(row);
  }
  return region;
}

/**
 * Asserts that every message-symbol region (row-major: left to right, then
 * top to bottom) matches the alphabet's rendering of the corresponding
 * character, and every other case in the grid is filled with a colour from
 * the given palette.
 *
 * Deliberately checks case by case rather than assuming the grid height is
 * an exact multiple of symbolHeight: buildGrid rounds height up to a
 * multiple of pivotBlockSize, which can leave a trailing partial row of
 * cases that doesn't correspond to any whole symbol-height slot. A
 * slot-based sweep across the full grid height would read past the last
 * real row in that situation. Loops here are fine - this is test-support
 * code, not the body of an `it` block.
 */
export function expectPaddingOnlyAfterMessage(
  grid: ColorGrid,
  message: string,
  alphabet: VisualAlphabet,
  palette: string[],
): void {
  const symbolsPerRow = grid[0].length / alphabet.symbolWidth;
  const paletteSet = new Set(palette);
  const occupied = new Set<string>();

  for (let i = 0; i < message.length; i++) {
    const row = Math.floor(i / symbolsPerRow);
    const col = i % symbolsPerRow;
    const baseX = col * alphabet.symbolWidth;
    const baseY = row * alphabet.symbolHeight;
    const region = extractRegion(
      grid,
      baseX,
      baseY,
      alphabet.symbolWidth,
      alphabet.symbolHeight,
    );
    expect(region).toEqual(alphabet.getBlock(message[i]));

    for (let dy = 0; dy < alphabet.symbolHeight; dy++) {
      for (let dx = 0; dx < alphabet.symbolWidth; dx++) {
        occupied.add(`${baseX + dx},${baseY + dy}`);
      }
    }
  }

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (!occupied.has(`${x},${y}`)) {
        expect(paletteSet.has(grid[y][x])).toBe(true);
      }
    }
  }
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing unrelated errors elsewhere, if any, are not your concern).

- [x] **Step 3: Commit**

```bash
git add backend/src/cipher/__fixtures__/cipher.fixtures.ts
git commit -m "$(cat <<'EOF'
test(cipher): add shared fixtures for grid construction tests

Modified files:
- backend/src/cipher/__fixtures__/cipher.fixtures.ts - pivot sizes, sample messages, palette, and two assertion helpers, per docs/tests/cipher.md's Fixtures section
EOF
)"
```

---

### Task 2: buildGrid implementation and full test suite

**Files:**
- Create: `backend/src/cipher/build-grid.ts`
- Test: `backend/src/cipher/build-grid.spec.ts`

**Interfaces:**
- Consumes: `VisualAlphabet`, `ColorGrid` from `../shared/types`; `gcd` from `../validation/validate-params`; everything produced by Task 1's fixtures file.
- Produces: `export function buildGrid(processedString: string, alphabet: VisualAlphabet, pivotBlockSize: number): ColorGrid`. This is what FEAT-007 (rotation engine) and FEAT-011 (encode endpoint) will call next.

- [x] **Step 1: Write the failing tests**

```typescript
// backend/src/cipher/build-grid.spec.ts
import { buildGrid } from './build-grid';
import { MockAlphabet } from '../../test/utils/mock-alphabet';
import {
  VALID_PIVOT_SIZES,
  SAMPLE_MESSAGES,
  MOCK_ALPHABET_PALETTE,
  extractRegion,
  expectPaddingOnlyAfterMessage,
} from './__fixtures__/cipher.fixtures';

describe('buildGrid', () => {
  describe('dimensions', () => {
    it('produces a grid whose width in cases is a multiple of pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 7);
      expect(grid[0].length % 7).toBe(0);
    });

    it('produces a grid whose height in cases is a multiple of pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 7);
      expect(grid.length % 7).toBe(0);
    });

    it('satisfies both dimension constraints for T=5, T=7, T=11', () => {
      const alphabet = new MockAlphabet();
      const results = VALID_PIVOT_SIZES.map((T) => {
        const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, T);
        return grid[0].length % T === 0 && grid.length % T === 0;
      });
      expect(results).toEqual(VALID_PIVOT_SIZES.map(() => true));
    });
  });

  describe('symbol layout', () => {
    it('places the first symbol of the message at position (0,0)', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 5);
      expect(
        extractRegion(grid, 0, 0, alphabet.symbolWidth, alphabet.symbolHeight),
      ).toEqual(alphabet.getBlock('A'));
    });

    it('lays out symbols left-to-right, top-to-bottom within the message area', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 5);
      // symbolsPerRow = lcm(5,3)/3 = 15/3 = 5, so 'ABCDEF' wraps: row 0 = ABCDE, row 1 = F
      expect(
        extractRegion(
          grid,
          alphabet.symbolWidth,
          0,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        ),
      ).toEqual(alphabet.getBlock('B'));
      expect(
        extractRegion(
          grid,
          0,
          alphabet.symbolHeight,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        ),
      ).toEqual(alphabet.getBlock('F'));
    });

    it('places all N symbols of the message in the grid (no symbol omitted)', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.allSupportedChars;
      const grid = buildGrid(message, alphabet, 5);
      const symbolsPerRow = 5;
      const placed = Array.from(message).map((_char, i) => {
        const row = Math.floor(i / symbolsPerRow);
        const col = i % symbolsPerRow;
        return extractRegion(
          grid,
          col * alphabet.symbolWidth,
          row * alphabet.symbolHeight,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        );
      });
      expect(placed).toEqual(
        Array.from(message).map((char) => alphabet.getBlock(char)),
      );
    });

    it('places no message symbol in the padding area', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      const paddingCellRightAfterMessage = grid[0][alphabet.symbolWidth];
      expect(MOCK_ALPHABET_PALETTE).toContain(paddingCellRightAfterMessage);
    });
  });

  describe('padding', () => {
    it("fills trailing positions with valid colour values from the alphabet's palette", () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      const trailingRegion = extractRegion(
        grid,
        alphabet.symbolWidth,
        0,
        grid[0].length - alphabet.symbolWidth,
        alphabet.symbolHeight,
      );
      expect(
        trailingRegion
          .flat()
          .every((color) => MOCK_ALPHABET_PALETTE.includes(color)),
      ).toBe(true);
    });

    it('places padding only after the last message symbol', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.singleChar;
      const grid = buildGrid(message, alphabet, 5);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('uses random padding (two calls with the same input may differ in padding content)', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.singleChar;
      const gridA = buildGrid(message, alphabet, 7);
      const gridB = buildGrid(message, alphabet, 7);
      expect(gridA).not.toEqual(gridB);
    });
  });

  describe('edge cases', () => {
    it('handles a message that fills the grid exactly (zero padding needed)', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(25);
      const grid = buildGrid(message, alphabet, 5);
      expect(grid.length).toBe(10);
      expect(grid[0].length).toBe(15);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('handles a single-character message', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      expect(
        extractRegion(grid, 0, 0, alphabet.symbolWidth, alphabet.symbolHeight),
      ).toEqual(alphabet.getBlock('A'));
      expect(grid.length % 5).toBe(0);
      expect(grid[0].length % 5).toBe(0);
    });

    it('handles an empty string (grid contains only padding)', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.empty, alphabet, 5);
      expect(grid.length).toBe(5);
      expect(grid[0].length).toBe(15);
      expect(
        grid.flat().every((color) => MOCK_ALPHABET_PALETTE.includes(color)),
      ).toBe(true);
    });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest cipher/build-grid.spec.ts`
Expected: FAIL - `Cannot find module './build-grid'`

- [x] **Step 3: Write the implementation**

```typescript
// backend/src/cipher/build-grid.ts
import { VisualAlphabet, ColorGrid } from '../shared/types';
import { gcd } from '../validation/validate-params';

/**
 * Builds the colour-case grid for a pre-processed message: lays symbols out
 * row by row (left to right, top to bottom) at a fixed width aligned to
 * both the pivot block size and the alphabet's symbol width, then fills
 * every remaining case with random padding drawn from the alphabet's own
 * colour palette.
 *
 * Symbol layout here is always this fixed row-major raster, independent of
 * the key's reading order - reading order governs which pivot block gets
 * which rotation later, not how symbols are initially placed.
 *
 * @param processedString - Message text already filtered to the alphabet's
 *   supported characters (see preprocess()). Every character must be
 *   resolvable via alphabet.getBlock.
 * @param alphabet - Supplies symbol dimensions and per-character colour grids.
 * @param pivotBlockSize - T: both grid dimensions, in cases, are multiples of this.
 */
export function buildGrid(
  processedString: string,
  alphabet: VisualAlphabet,
  pivotBlockSize: number,
): ColorGrid {
  const { symbolWidth, symbolHeight } = alphabet;

  const gridWidthInCases = lcm(pivotBlockSize, symbolWidth);
  const symbolsPerRow = gridWidthInCases / symbolWidth;

  const numRows = Math.ceil(processedString.length / symbolsPerRow);
  const neededHeightInCases = Math.max(symbolHeight, numRows * symbolHeight);
  const gridHeightInCases =
    Math.ceil(neededHeightInCases / pivotBlockSize) * pivotBlockSize;

  const grid: ColorGrid = Array.from({ length: gridHeightInCases }, () =>
    new Array<string>(gridWidthInCases).fill(''),
  );

  for (let i = 0; i < processedString.length; i++) {
    const symbolGrid = alphabet.getBlock(processedString[i]);
    const row = Math.floor(i / symbolsPerRow);
    const col = i % symbolsPerRow;
    const baseY = row * symbolHeight;
    const baseX = col * symbolWidth;

    for (let dy = 0; dy < symbolHeight; dy++) {
      for (let dx = 0; dx < symbolWidth; dx++) {
        grid[baseY + dy][baseX + dx] = symbolGrid[dy][dx];
      }
    }
  }

  const palette = getPalette(alphabet);
  for (let y = 0; y < gridHeightInCases; y++) {
    for (let x = 0; x < gridWidthInCases; x++) {
      if (grid[y][x] === '') {
        grid[y][x] = palette[Math.floor(Math.random() * palette.length)];
      }
    }
  }

  return grid;
}

/** Smallest width, in cases, that is a multiple of both the block size and the symbol width. */
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** Every distinct colour value used across the alphabet's supported characters. */
function getPalette(alphabet: VisualAlphabet): string[] {
  const colors = new Set<string>();
  for (const char of alphabet.getSupportedChars()) {
    for (const row of alphabet.getBlock(char)) {
      for (const color of row) {
        colors.add(color);
      }
    }
  }
  return Array.from(colors);
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest cipher/build-grid.spec.ts`
Expected: PASS (13 tests)

- [x] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including the new one, no regressions (168 pre-existing + 13 new = 181).

- [x] **Step 6: Commit**

```bash
git add backend/src/cipher/build-grid.ts backend/src/cipher/build-grid.spec.ts
git commit -m "$(cat <<'EOF'
feat(cipher): implement buildGrid for symbol layout and random padding

Modified files:
- backend/src/cipher/build-grid.ts - lays a pre-processed message into a colour-case grid sized to lcm(pivotBlockSize, symbolWidth) wide and the next multiple of pivotBlockSize tall, padding remaining cases with random colours from the alphabet's palette
- backend/src/cipher/build-grid.spec.ts - 13 tests matching docs/tests/cipher.md section 4 one-to-one (dimensions, symbol layout, padding, edge cases)
EOF
)"
```

---

## Post-review addendum (final whole-branch review)

Tasks 1-2 above were implemented, task-reviewed, and passed a final whole-branch review. That
review found two Important gaps closed in a fix wave already on this branch (a missing
`pivotBlockSize` guard, and missing T=6 test coverage per `BACKLOG.md`'s own acceptance
criterion) - both done, re-reviewed clean, not this addendum's concern.

The same review also found a real architectural problem, deliberately left unfixed on the
branch pending a decision: `gridWidthInCases = lcm(pivotBlockSize, symbolWidth)` is the
*smallest* width satisfying both alignment constraints, and for the real Hexahue alphabet
(`symbolWidth = 2`) that smallest width is only 1 pivot-block column wide for even T, or 2
columns for odd T - regardless of message length. Long messages then grow arbitrarily tall
and narrow instead of roughly square (measured: a 500-character message at T=7 produces a
14x217 grid). Worse, with only 1-2 pivot-block columns, `ReadingOrderRegistry`'s 8 strategies
(FEAT-005) become visually near-identical, undermining the whole point of a configurable
reading order.

The user's decision (2026-08-14): widen the grid. Task 3 below makes the grid's width
adaptive - still always a multiple of both `pivotBlockSize` and `symbolWidth` (the two
existing acceptance criteria are untouched), but scaled up by an integer multiplier chosen to
bring the grid close to square for the actual message length, instead of always using the
bare minimum multiplier of 1.

**Why this needs no test rewrites:** the multiplier only exceeds 1 once the message is long
relative to the base unit (`lcm(pivotBlockSize, symbolWidth)`). Every message used in Tasks
1-2's existing 17 tests is short enough (longest is 25 characters) that the multiplier stays
at 1 for all of them - verified by hand for every existing test's exact (message length, T)
pair before writing this task. All 17 existing tests keep passing unchanged; Task 3 only adds
new tests proving the widening behaviour itself.

### Task 3: Adaptive grid width (square-ish grids for long messages)

**Files:**
- Modify: `backend/src/cipher/build-grid.ts`
- Modify: `backend/src/cipher/build-grid.spec.ts`

**Interfaces:**
- `buildGrid`'s exported signature is unchanged (`buildGrid(processedString, alphabet, pivotBlockSize): ColorGrid`). Only its internal width computation changes.

- [x] **Step 1: Write the failing tests**

Add this new `describe` block to `backend/src/cipher/build-grid.spec.ts`, as a sibling of the
existing `dimensions`/`symbol layout`/`padding`/`edge cases`/`input validation` blocks, inside
the outer `describe('buildGrid', ...)`:

```typescript
  describe('adaptive width for long messages', () => {
    it('widens the grid for a long message instead of only growing taller', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(90);
      const grid = buildGrid(message, alphabet, 5);
      expect(grid[0].length).toBe(30);
      expect(grid.length).toBe(20);
    });

    it('places symbols and padding correctly once the grid has widened', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(90);
      const grid = buildGrid(message, alphabet, 5);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('keeps the grid roughly square for a very long message instead of growing arbitrarily tall', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(200);
      const grid = buildGrid(message, alphabet, 7);
      expect(grid[0].length).toBe(42);
      expect(grid.length).toBe(35);
    });

    it('still produces a width and height that are both multiples of pivotBlockSize once widened', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(200);
      const grid = buildGrid(message, alphabet, 7);
      expect(grid[0].length % 7).toBe(0);
      expect(grid.length % 7).toBe(0);
    });
  });
```

(Expected values derived by hand: for `pivotBlockSize=5`, `MockAlphabet` (`symbolWidth=3`,
`symbolHeight=2`), 90 characters: base unit `lcm(5,3)=15`, ideal width
`sqrt(90*3*2)=sqrt(540)=~23.24`, multiplier `round(23.24/15)=2`, so
`gridWidthInCases=30`, `symbolsPerRow=10`, `numRows=ceil(90/10)=9`, `neededHeight=18`,
`gridHeightInCases=ceil(18/5)*5=20`. For `pivotBlockSize=7`, 200 characters: base unit
`lcm(7,3)=21`, ideal width `sqrt(200*3*2)=sqrt(1200)=~34.64`, multiplier
`round(34.64/21)=2`, `gridWidthInCases=42`, `symbolsPerRow=14`,
`numRows=ceil(200/14)=15`, `neededHeight=30`, `gridHeightInCases=ceil(30/7)*7=35`.)

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest cipher/build-grid.spec.ts -t "adaptive width"`
Expected: FAIL - the two dimension assertions in the first and third tests get the old
(narrower) values instead of the new ones (`grid[0].length` would be 15 not 30, and 21 not 42).

- [x] **Step 3: Change the width computation**

In `backend/src/cipher/build-grid.ts`, replace the JSDoc block and the width-computation lines:

```typescript
/**
 * Builds the colour-case grid for a pre-processed message: lays symbols out
 * row by row (left to right, top to bottom) at a fixed width aligned to
 * both the pivot block size and the alphabet's symbol width, then fills
 * every remaining case with random padding drawn from the alphabet's own
 * colour palette.
 *
 * Symbol layout here is always this fixed row-major raster, independent of
 * the key's reading order - reading order governs which pivot block gets
 * which rotation later, not how symbols are initially placed.
 *
 * @param processedString - Message text already filtered to the alphabet's
 *   supported characters (see preprocess()). Every character must be
 *   resolvable via alphabet.getBlock.
 * @param alphabet - Supplies symbol dimensions and per-character colour grids.
 * @param pivotBlockSize - T: both grid dimensions, in cases, are multiples of this.
 */
export function buildGrid(
  processedString: string,
  alphabet: VisualAlphabet,
  pivotBlockSize: number,
): ColorGrid {
  if (!Number.isInteger(pivotBlockSize) || pivotBlockSize < 1) {
    throw new RangeError(
      `pivotBlockSize must be a positive integer, got ${pivotBlockSize}`,
    );
  }

  const { symbolWidth, symbolHeight } = alphabet;

  const gridWidthInCases = lcm(pivotBlockSize, symbolWidth);
  const symbolsPerRow = gridWidthInCases / symbolWidth;
```

with:

```typescript
/**
 * Builds the colour-case grid for a pre-processed message: lays symbols out
 * row by row (left to right, top to bottom), then fills every remaining
 * case with random padding drawn from the alphabet's own colour palette.
 *
 * Grid width is chosen adaptively to keep the grid roughly square rather
 * than growing arbitrarily tall for long messages: the width is the
 * multiple of lcm(pivotBlockSize, symbolWidth) (the base unit satisfying
 * both the block-alignment and symbol-alignment constraints) closest to
 * sqrt(messageLength * symbolWidth * symbolHeight) - the width a perfectly
 * square layout of the message would need. Short messages naturally land
 * on a multiplier of 1 (a single base unit wide); only long messages widen
 * further.
 *
 * Symbol layout here is always this row-major raster, independent of
 * the key's reading order - reading order governs which pivot block gets
 * which rotation later, not how symbols are initially placed.
 *
 * @param processedString - Message text already filtered to the alphabet's
 *   supported characters (see preprocess()). Every character must be
 *   resolvable via alphabet.getBlock.
 * @param alphabet - Supplies symbol dimensions and per-character colour grids.
 * @param pivotBlockSize - T: both grid dimensions, in cases, are multiples of this.
 */
export function buildGrid(
  processedString: string,
  alphabet: VisualAlphabet,
  pivotBlockSize: number,
): ColorGrid {
  if (!Number.isInteger(pivotBlockSize) || pivotBlockSize < 1) {
    throw new RangeError(
      `pivotBlockSize must be a positive integer, got ${pivotBlockSize}`,
    );
  }

  const { symbolWidth, symbolHeight } = alphabet;

  const baseWidthUnit = lcm(pivotBlockSize, symbolWidth);
  const baseSymbolsPerRow = baseWidthUnit / symbolWidth;

  const idealWidthInCases = Math.sqrt(
    processedString.length * symbolWidth * symbolHeight,
  );
  const widthMultiplier = Math.max(
    1,
    Math.round(idealWidthInCases / baseWidthUnit),
  );

  const gridWidthInCases = widthMultiplier * baseWidthUnit;
  const symbolsPerRow = widthMultiplier * baseSymbolsPerRow;
```

Do not change anything else in the function - the height computation, the symbol-placement
loop, and the padding loop are all unaffected and stay exactly as they are (they already
consume `gridWidthInCases` and `symbolsPerRow` generically, not the old formula directly).

- [x] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest cipher/build-grid.spec.ts`
Expected: PASS, all tests in the file (the 17 pre-existing tests unaffected, plus the 4 new
ones from Step 1) = 21 tests in this file.

- [x] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites, no regressions (185 pre-existing + 4 new = 189).

- [x] **Step 6: Commit**

```bash
git add backend/src/cipher/build-grid.ts backend/src/cipher/build-grid.spec.ts
git commit -m "$(cat <<'EOF'
fix(cipher): widen the grid adaptively instead of always using the minimum width

Modified files:
- backend/src/cipher/build-grid.ts - grid width is now a multiple of lcm(pivotBlockSize, symbolWidth) chosen to bring the grid close to square for the actual message length, instead of always the bare minimum multiplier of 1 (which collapsed to 1-2 pivot-block columns for Hexahue's real symbolWidth=2, undermining FEAT-005's reading-order strategies and producing extreme aspect ratios for long messages)
- backend/src/cipher/build-grid.spec.ts - add tests proving the widening behaviour: a moderately long message widens instead of only growing taller, symbol/padding placement remains correct once widened, a long message stays roughly square, and both dimensions remain multiples of pivotBlockSize after widening
EOF
)"
```

---

## After this plan

Update `BACKLOG.md` (`FEAT-006` status `ready` -> `done`) in the same PR, push `feat/FEAT-006-grid-construction`, and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-007** (block rotation engine), which will consume both `buildGrid`'s output and `ReadingOrderRegistry` (FEAT-005) together for the first time. Read `docs/tests/rotation.md` before planning it.
