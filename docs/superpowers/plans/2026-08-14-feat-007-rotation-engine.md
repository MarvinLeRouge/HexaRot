# FEAT-007 - Block Rotation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the block rotation step of the HexaRot cipher: `rotateBlock` (a pure function rotating a single square colour-case block by 0/90/180/270 degrees, clockwise or counter-clockwise) and `RotationEngine` (encode/decode over a full grid, applying the rotation sequence to pivot blocks in the order given by a `ReadingOrderStrategy`, cycling the sequence when there are more blocks than entries).

**Architecture:** `rotateBlock` is a standalone pure function with no dependencies - one 90-degree-clockwise primitive, composed 0-3 times to cover all four angles and both directions (270 CCW is the same operation as 90 CW, etc., so there is exactly one rotation formula in the whole module). `RotationEngine` is a thin orchestrator: it asks a `ReadingOrderStrategy` (via the existing `ReadingOrderRegistry` from FEAT-005) for the block traversal order, then calls `rotateBlock` once per block. It has no rotation math of its own. Decoding reverses this: same block order, same per-block angle, but the opposite rotation direction, applied to a reversed traversal (blocks are disjoint regions, so processing order does not affect correctness, but this plan follows the spec's stated "reverse block order" literally rather than relying on that invariant silently).

**Tech Stack:** TypeScript (strict), NestJS (for `RotationEngine`'s DI on `ReadingOrderRegistry`), Jest + ts-jest.

**Spec:** `BACKLOG.md` (`FEAT-007`) and `docs/tests/rotation.md` (all three sections and the Fixtures section) - read both before touching code.

## Global Constraints

- TypeScript strict mode, no implicit any. Code, comments, commit messages: English.
- No em dash, en dash used as a hyphen, or curly quotes anywhere written - code, comments, or commit messages. Plain hyphen `-` only.
- Conventional Commits format, with the mandatory "Modified files:" list.
- Branch: `feat/FEAT-007-rotation-engine`, created from up-to-date `main`.
- `docs/tests/index.md` section 4 governs every test in this plan: each `it` body must be a single flat assertion path - no `for`/`while`/`if` control-flow statements written directly inside an `it` callback. A well-named helper function that itself loops (defined once in the fixtures file, called as a single line from within an `it`) is acceptable - this project's established reading, confirmed across multiple rounds of review on the FEAT-005 and FEAT-006 branches. `.map()`/`.filter()`/`.every()` functional expressions used inline are also acceptable.
- Pivot blocks are always square (T x T); `rotateBlock` only needs to handle square grids.
- `RotationSequence` (`[number, number, number, number]`, imported from `../key/key-codec`) stores **angle indices**, not degrees: each entry is 0, 1, 2, or 3, mapping to 0, 90, 180, 270 degrees respectively (see `key-codec.ts`'s own JSDoc on `RotationSequence`). `docs/tests/rotation.md`'s bullets describe sequences using degree shorthand (e.g. "[90, 180, 270, 0]") for readability; this plan's tests translate those to the actual index encoding ([1, 2, 3, 0]) when calling real code.
- `ReadingOrder` type and `ReadingOrderRegistry`/`ReadingOrderStrategy` already exist from FEAT-005 (`backend/src/reading-order/`) - reuse them, do not redefine.
- `ColorGrid` (`string[][]`, indexed `grid[row][col]`) is exported from the `backend/src/shared/types` barrel - import from there.
- `docs/tests/rotation.md`'s example dimensions for `SAMPLE_FULL_GRID` ("10x6 cases = 2x2 blocks of T=5") are internally inconsistent - 2x2 blocks of T=5 is 10x10 cases, not 10x6. This plan uses 10x10, matching the unambiguous "2x2 blocks of T=5" statement over the arithmetically-wrong "10x6".

---

## File Structure

- Create: `backend/src/rotation/__fixtures__/rotation.fixtures.ts` - `KNOWN_2x2_BLOCK`, `KNOWN_3x3_BLOCK`, `KNOWN_5x5_BLOCK`, `SAMPLE_FULL_GRID`, `ALL_ROTATION_SEQUENCES` (per `docs/tests/rotation.md`'s Fixtures section), plus one test-support helper this plan adds beyond that section's literal list: `extractRegion`.
- Create: `backend/src/rotation/rotate-block.ts` - `rotateBlock`, `RotationAngle`, `RotationDirection` (only exports; the single 90-degree-clockwise primitive and the clone helper are private).
- Create: `backend/src/rotation/rotate-block.spec.ts` - the 19 tests matching `docs/tests/rotation.md` sections 1 and 3 one-to-one.
- Create: `backend/src/rotation/rotation-engine.ts` - the `RotationEngine` class (`encode`, `decode`).
- Create: `backend/src/rotation/rotation-engine.spec.ts` - the 15 tests matching `docs/tests/rotation.md` section 2 one-to-one.
- Modify: `backend/src/rotation/rotation.module.ts` - register `RotationEngine` as a provider/export, import `ReadingOrderModule`.
- Create: `backend/src/rotation/rotation.module.spec.ts` - a NestJS DI wiring test (this project's established pattern after FEAT-005 found `reading-order.module.ts` had 0% coverage from tests that only ever did `new X()` directly).

---

### Task 1: Rotation fixtures file

**Files:**
- Create: `backend/src/rotation/__fixtures__/rotation.fixtures.ts`

**Interfaces:**
- Consumes: `ColorGrid` from `../../shared/types`; `RotationSequence` from `../../key/key-codec`.
- Produces: `KNOWN_2x2_BLOCK: { grid: ColorGrid; cw90: ColorGrid; ccw90: ColorGrid; rotate180: ColorGrid }`, `KNOWN_3x3_BLOCK` (same shape), `KNOWN_5x5_BLOCK: { grid: ColorGrid; cw90: ColorGrid }`, `SAMPLE_FULL_GRID: ColorGrid` (10x10), `ALL_ROTATION_SEQUENCES: RotationSequence[]`, `extractRegion(grid: ColorGrid, x: number, y: number, width: number, height: number): ColorGrid`.

- [ ] **Step 1: Create the fixtures file**

```typescript
// backend/src/rotation/__fixtures__/rotation.fixtures.ts
import { ColorGrid } from '../../shared/types';
import { RotationSequence } from '../../key/key-codec';

/**
 * A 2x2 block with four distinct cell values, so rotation correctness can
 * be verified by cell position. Expected outputs hand-derived from the
 * rotation formula: for 90deg clockwise, new[i][j] = old[n-1-j][i].
 */
export const KNOWN_2x2_BLOCK = {
  grid: [
    ['A', 'B'],
    ['C', 'D'],
  ] as ColorGrid,
  cw90: [
    ['C', 'A'],
    ['D', 'B'],
  ] as ColorGrid,
  ccw90: [
    ['B', 'D'],
    ['A', 'C'],
  ] as ColorGrid,
  rotate180: [
    ['D', 'C'],
    ['B', 'A'],
  ] as ColorGrid,
};

/**
 * A 3x3 block with nine distinct cell values. Expected outputs derived the
 * same way as KNOWN_2x2_BLOCK.
 */
export const KNOWN_3x3_BLOCK = {
  grid: [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ] as ColorGrid,
  cw90: [
    ['G', 'D', 'A'],
    ['H', 'E', 'B'],
    ['I', 'F', 'C'],
  ] as ColorGrid,
  ccw90: [
    ['C', 'F', 'I'],
    ['B', 'E', 'H'],
    ['A', 'D', 'G'],
  ] as ColorGrid,
  rotate180: [
    ['I', 'H', 'G'],
    ['F', 'E', 'D'],
    ['C', 'B', 'A'],
  ] as ColorGrid,
};

/**
 * A 5x5 block where each cell's value encodes its own (row, col) position
 * as a two-character string, e.g. "34" is row 3, column 4. This makes the
 * 90-degree-clockwise expected output mechanically derivable (new[i][j] =
 * old[4-j][i], so new[i][j] = the string "(4-j)(i)") without needing to
 * spatially visualise a 25-cell rotation by hand.
 */
export const KNOWN_5x5_BLOCK = {
  grid: [
    ['00', '01', '02', '03', '04'],
    ['10', '11', '12', '13', '14'],
    ['20', '21', '22', '23', '24'],
    ['30', '31', '32', '33', '34'],
    ['40', '41', '42', '43', '44'],
  ] as ColorGrid,
  cw90: [
    ['40', '30', '20', '10', '00'],
    ['41', '31', '21', '11', '01'],
    ['42', '32', '22', '12', '02'],
    ['43', '33', '23', '13', '03'],
    ['44', '34', '24', '14', '04'],
  ] as ColorGrid,
};

/**
 * A 10x10 grid (2x2 pivot blocks of size 5) where each cell's value encodes
 * its own position as "row-col". Used for RotationEngine tests: any bug in
 * block extraction, placement, or ordering shows up as a position-label
 * mismatch, without needing hand-derived full-grid literals.
 */
export const SAMPLE_FULL_GRID: ColorGrid = Array.from({ length: 10 }, (_, row) =>
  Array.from({ length: 10 }, (_, col) => `${row}-${col}`),
);

/**
 * A representative subset of rotation sequences. Entries are angle
 * indices (0=0deg, 1=90deg, 2=180deg, 3=270deg), not degrees.
 */
export const ALL_ROTATION_SEQUENCES: RotationSequence[] = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 1, 2, 3],
  [3, 2, 1, 0],
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing unrelated errors elsewhere are not your concern).

- [ ] **Step 3: Commit**

```bash
git add backend/src/rotation/__fixtures__/rotation.fixtures.ts
git commit -m "$(cat <<'EOF'
test(rotation): add shared fixtures for rotation engine tests

Modified files:
- backend/src/rotation/__fixtures__/rotation.fixtures.ts - known 2x2/3x3/5x5 blocks with hand-derived rotated outputs, a position-labelled 10x10 sample grid, representative rotation sequences, and a region-extraction helper, per docs/tests/rotation.md's Fixtures section
EOF
)"
```

---

### Task 2: rotateBlock implementation and full test suite

**Files:**
- Create: `backend/src/rotation/rotate-block.ts`
- Test: `backend/src/rotation/rotate-block.spec.ts`

**Interfaces:**
- Consumes: `ColorGrid` from `../shared/types`; everything produced by Task 1's fixtures file.
- Produces: `export type RotationAngle = 0 | 90 | 180 | 270`, `export type RotationDirection = 'cw' | 'ccw'`, `export function rotateBlock(block: ColorGrid, angle: RotationAngle, direction: RotationDirection): ColorGrid`. This is what Task 3's `RotationEngine` calls once per pivot block.

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/rotation/rotate-block.spec.ts
import { rotateBlock } from './rotate-block';
import {
  KNOWN_2x2_BLOCK,
  KNOWN_3x3_BLOCK,
  KNOWN_5x5_BLOCK,
} from './__fixtures__/rotation.fixtures';

describe('rotateBlock', () => {
  describe('0 degree rotation', () => {
    it('returns a grid identical to the input for 0 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 0, 'cw')).toEqual(
        KNOWN_2x2_BLOCK.grid,
      );
    });

    it('returns a grid identical to the input for 0 degrees counter-clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 0, 'ccw')).toEqual(
        KNOWN_2x2_BLOCK.grid,
      );
    });
  });

  describe('90 degree rotation', () => {
    it('places the top-left cell at the top-right position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[0][1]).toBe(KNOWN_2x2_BLOCK.grid[0][0]);
    });

    it('places the top-right cell at the bottom-right position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[1][1]).toBe(KNOWN_2x2_BLOCK.grid[0][1]);
    });

    it('places the bottom-right cell at the bottom-left position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[1][0]).toBe(KNOWN_2x2_BLOCK.grid[1][1]);
    });

    it('places the bottom-left cell at the top-left position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[0][0]).toBe(KNOWN_2x2_BLOCK.grid[1][0]);
    });

    it('produces the correct full output for a 2x2 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_2x2_BLOCK.cw90,
      );
    });

    it('produces the correct full output for a 3x3 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_3x3_BLOCK.cw90,
      );
    });

    it('produces the correct full output for a 5x5 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_5x5_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_5x5_BLOCK.cw90,
      );
    });

    it('produces the mirror result for 90 degrees counter-clockwise vs 90 degrees clockwise', () => {
      const cw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      const ccw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw');
      expect(ccw).toEqual(KNOWN_3x3_BLOCK.ccw90);
      expect(cw).not.toEqual(ccw);
    });
  });

  describe('180 degree rotation', () => {
    it('produces the correct full output for a known block at 180 degrees (direction-agnostic)', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw')).toEqual(
        KNOWN_3x3_BLOCK.rotate180,
      );
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'ccw')).toEqual(
        KNOWN_3x3_BLOCK.rotate180,
      );
    });

    it('is equivalent to two successive 90 degree clockwise rotations', () => {
      const twice = rotateBlock(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw'),
        90,
        'cw',
      );
      expect(twice).toEqual(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw'));
    });
  });

  describe('270 degree rotation', () => {
    it('is equivalent to three successive 90 degree clockwise rotations', () => {
      const thrice = rotateBlock(
        rotateBlock(rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw'), 90, 'cw'),
        90,
        'cw',
      );
      expect(thrice).toEqual(rotateBlock(KNOWN_3x3_BLOCK.grid, 270, 'cw'));
    });

    it('is equivalent to one 90 degree counter-clockwise rotation', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 270, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw'),
      );
    });
  });

  describe('immutability', () => {
    it('does not mutate the input block', () => {
      const original = KNOWN_3x3_BLOCK.grid.map((row) => [...row]);
      rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      expect(KNOWN_3x3_BLOCK.grid).toEqual(original);
    });

    it('returns a new grid object', () => {
      const result = rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'cw');
      expect(result).not.toBe(KNOWN_3x3_BLOCK.grid);
    });
  });

  describe('rotateBlock - direction symmetry', () => {
    it('produces different results for CW vs CCW at 90 degrees for a non-uniform block', () => {
      const cw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      const ccw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw');
      expect(cw).not.toEqual(ccw);
    });

    it('produces the same result for CW vs CCW at 0 degrees', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'ccw'),
      );
    });

    it('produces the same result for CW vs CCW at 180 degrees', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'ccw'),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest rotation/rotate-block.spec.ts`
Expected: FAIL - `Cannot find module './rotate-block'`

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/rotation/rotate-block.ts
import { ColorGrid } from '../shared/types';

export type RotationAngle = 0 | 90 | 180 | 270;
export type RotationDirection = 'cw' | 'ccw';

/**
 * Rotates a square colour-case block by the given angle and direction.
 * Never mutates the input; always returns a new grid, even for a 0 degree
 * rotation.
 *
 * Implemented as 0-3 applications of a single 90-degree-clockwise
 * primitive: a counter-clockwise rotation by angle A is the same
 * transformation as a clockwise rotation by (360 - A) degrees.
 */
export function rotateBlock(
  block: ColorGrid,
  angle: RotationAngle,
  direction: RotationDirection,
): ColorGrid {
  const steps = computeClockwiseSteps(angle, direction);
  if (steps === 0) {
    return cloneGrid(block);
  }

  let result = block;
  for (let i = 0; i < steps; i++) {
    result = rotate90Clockwise(result);
  }
  return result;
}

function computeClockwiseSteps(
  angle: RotationAngle,
  direction: RotationDirection,
): number {
  const effectiveAngle = direction === 'ccw' ? (360 - angle) % 360 : angle;
  return effectiveAngle / 90;
}

function rotate90Clockwise(block: ColorGrid): ColorGrid {
  const n = block.length;
  const result: ColorGrid = Array.from({ length: n }, () =>
    new Array<string>(n).fill(''),
  );
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i][j] = block[n - 1 - j][i];
    }
  }
  return result;
}

function cloneGrid(grid: ColorGrid): ColorGrid {
  return grid.map((row) => [...row]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest rotation/rotate-block.spec.ts`
Expected: PASS (19 tests)

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including Task 1's file, no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/src/rotation/rotate-block.ts backend/src/rotation/rotate-block.spec.ts
git commit -m "$(cat <<'EOF'
feat(rotation): implement rotateBlock for single-block rotation

Modified files:
- backend/src/rotation/rotate-block.ts - rotates a square colour-case block by 0/90/180/270 degrees, clockwise or counter-clockwise, via 0-3 applications of a single 90-degree-clockwise primitive
- backend/src/rotation/rotate-block.spec.ts - 19 tests matching docs/tests/rotation.md sections 1 and 3 one-to-one (all four angles, both directions, equivalences, immutability, direction symmetry)
EOF
)"
```

---

### Task 3: RotationEngine, module wiring, and full test suite

**Files:**
- Create: `backend/src/rotation/rotation-engine.ts`
- Test: `backend/src/rotation/rotation-engine.spec.ts`
- Modify: `backend/src/rotation/rotation.module.ts`
- Create: `backend/src/rotation/rotation.module.spec.ts`

**Interfaces:**
- Consumes: `rotateBlock`, `RotationAngle`, `RotationDirection` from `./rotate-block` (Task 2); `ReadingOrderRegistry` from `../reading-order/reading-order.registry` (FEAT-005, already merged); `ReadingOrder`, `RotationSequence` from `../key/key-codec`; `ColorGrid` from `../shared/types`; everything produced by Task 1's fixtures file.
- Produces: `export class RotationEngine` with `constructor(private readonly readingOrderRegistry: ReadingOrderRegistry)`, `encode(grid: ColorGrid, pivotBlockSize: number, rotationSequence: RotationSequence, direction: RotationDirection, readingOrder: ReadingOrder): ColorGrid`, `decode(grid: ColorGrid, pivotBlockSize: number, rotationSequence: RotationSequence, direction: RotationDirection, readingOrder: ReadingOrder): ColorGrid`. This is what FEAT-011 (encode endpoint) and FEAT-012 (decode endpoint) will inject and call next.

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/rotation/rotation-engine.spec.ts
import { ColorGrid } from '../shared/types';
import { RotationEngine } from './rotation-engine';
import { rotateBlock } from './rotate-block';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import {
  SAMPLE_FULL_GRID,
  extractRegion,
} from './__fixtures__/rotation.fixtures';

describe('RotationEngine.encode', () => {
  it('applies the rotation sequence to blocks in the order defined by the ReadingOrderStrategy', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const result = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    // LR-TB on a 2x2 block grid visits (0,0), (1,0), (0,1), (1,1) in that order
    const originalBlock00 = extractRegion(SAMPLE_FULL_GRID, 0, 0, 5, 5);
    const originalBlock10 = extractRegion(SAMPLE_FULL_GRID, 5, 0, 5, 5);
    const originalBlock01 = extractRegion(SAMPLE_FULL_GRID, 0, 5, 5, 5);
    const originalBlock11 = extractRegion(SAMPLE_FULL_GRID, 5, 5, 5, 5);
    expect(extractRegion(result, 0, 0, 5, 5)).toEqual(
      rotateBlock(originalBlock00, 0, 'cw'),
    );
    expect(extractRegion(result, 5, 0, 5, 5)).toEqual(
      rotateBlock(originalBlock10, 90, 'cw'),
    );
    expect(extractRegion(result, 0, 5, 5, 5)).toEqual(
      rotateBlock(originalBlock01, 180, 'cw'),
    );
    expect(extractRegion(result, 5, 5, 5, 5)).toEqual(
      rotateBlock(originalBlock11, 270, 'cw'),
    );
  });

  it('cycles through the rotation sequence when there are more blocks than sequence entries (5 blocks, sequence length 4)', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const grid: ColorGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 25 }, (_, col) => `${row}-${col}`),
    ); // 5x1 blocks of T=5
    const result = engine.encode(grid, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    const fifthBlockOriginal = extractRegion(grid, 20, 0, 5, 5);
    // block index 4 -> seq[4 % 4] = seq[0] = angle index 0 = 0 degrees, same as block index 0
    expect(extractRegion(result, 20, 0, 5, 5)).toEqual(
      rotateBlock(fifthBlockOriginal, 0, 'cw'),
    );
  });

  it('applies rotation direction (CW vs CCW) consistently to all blocks', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const cwResult = engine.encode(SAMPLE_FULL_GRID, 5, [1, 1, 1, 1], 'cw', 'LR-TB');
    const ccwResult = engine.encode(SAMPLE_FULL_GRID, 5, [1, 1, 1, 1], 'ccw', 'LR-TB');
    const originalBlock00 = extractRegion(SAMPLE_FULL_GRID, 0, 0, 5, 5);
    expect(extractRegion(cwResult, 0, 0, 5, 5)).toEqual(
      rotateBlock(originalBlock00, 90, 'cw'),
    );
    expect(extractRegion(ccwResult, 0, 0, 5, 5)).toEqual(
      rotateBlock(originalBlock00, 90, 'ccw'),
    );
    expect(extractRegion(cwResult, 0, 0, 5, 5)).not.toEqual(
      extractRegion(ccwResult, 0, 0, 5, 5),
    );
  });

  it('leaves a block unchanged when the sequence entry is 0 degrees', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const result = engine.encode(SAMPLE_FULL_GRID, 5, [0, 0, 0, 0], 'cw', 'LR-TB');
    expect(result).toEqual(SAMPLE_FULL_GRID);
  });

  it('produces a grid of the same dimensions as the input', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const result = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(result.length).toBe(SAMPLE_FULL_GRID.length);
    expect(result[0].length).toBe(SAMPLE_FULL_GRID[0].length);
  });
});

describe('RotationEngine.decode', () => {
  it('applies the inverse rotation sequence in reverse block order', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(SAMPLE_FULL_GRID, 5, [1, 2, 3, 0], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [1, 2, 3, 0], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid after encode-decode for a single block', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const singleBlockGrid: ColorGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => `${row}-${col}`),
    );
    const encoded = engine.encode(singleBlockGrid, 5, [2, 0, 0, 0], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [2, 0, 0, 0], 'cw', 'LR-TB');
    expect(decoded).toEqual(singleBlockGrid);
  });

  it('recovers the original grid after encode-decode for a multi-block grid', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid for all four rotation angles', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid for both rotation directions', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encodedCw = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(engine.decode(encodedCw, 5, [0, 1, 2, 3], 'cw', 'LR-TB')).toEqual(
      SAMPLE_FULL_GRID,
    );
    const encodedCcw = engine.encode(SAMPLE_FULL_GRID, 5, [0, 1, 2, 3], 'ccw', 'LR-TB');
    expect(engine.decode(encodedCcw, 5, [0, 1, 2, 3], 'ccw', 'LR-TB')).toEqual(
      SAMPLE_FULL_GRID,
    );
  });
});

describe('RotationEngine round-trip (encode then decode)', () => {
  it('recovers the original grid for a 2x2 block grid, sequence [90, 180, 270, 0], CW', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(SAMPLE_FULL_GRID, 5, [1, 2, 3, 0], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [1, 2, 3, 0], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid for a 3x3 block grid, sequence [180, 0, 90, 270], CCW', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const grid: ColorGrid = Array.from({ length: 15 }, (_, row) =>
      Array.from({ length: 15 }, (_, col) => `${row}-${col}`),
    );
    const encoded = engine.encode(grid, 5, [2, 0, 1, 3], 'ccw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [2, 0, 1, 3], 'ccw', 'LR-TB');
    expect(decoded).toEqual(grid);
  });

  it('recovers the original grid for a non-square grid (wider than tall)', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const grid: ColorGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 15 }, (_, col) => `${row}-${col}`),
    ); // 3x1 blocks of T=5
    const encoded = engine.encode(grid, 5, [0, 1, 2, 3], 'cw', 'TB-LR');
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'TB-LR');
    expect(decoded).toEqual(grid);
  });

  it('recovers the original grid for a non-square grid (taller than wide)', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const grid: ColorGrid = Array.from({ length: 15 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => `${row}-${col}`),
    ); // 1x3 blocks of T=5
    const encoded = engine.encode(grid, 5, [3, 2, 1, 0], 'ccw', 'BT-LR');
    const decoded = engine.decode(encoded, 5, [3, 2, 1, 0], 'ccw', 'BT-LR');
    expect(decoded).toEqual(grid);
  });

  it('recovers the original grid when sequence cycling occurs', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const grid: ColorGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 25 }, (_, col) => `${row}-${col}`),
    ); // 5x1 blocks of T=5, more blocks than the 4-entry sequence
    const encoded = engine.encode(grid, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(decoded).toEqual(grid);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest rotation/rotation-engine.spec.ts`
Expected: FAIL - `Cannot find module './rotation-engine'`

- [ ] **Step 3: Implement RotationEngine**

```typescript
// backend/src/rotation/rotation-engine.ts
import { Injectable } from '@nestjs/common';
import { ColorGrid } from '../shared/types';
import { ReadingOrder, RotationSequence } from '../key/key-codec';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { rotateBlock, RotationAngle, RotationDirection } from './rotate-block';

const ROTATION_ANGLES: RotationAngle[] = [0, 90, 180, 270];

/**
 * Applies (and inverts) the block-rotation step of the HexaRot cipher: the
 * grid is divided into pivotBlockSize x pivotBlockSize pivot blocks,
 * traversed in the order given by a ReadingOrderStrategy, each rotated
 * according to the rotation sequence (cycling if there are more blocks
 * than sequence entries).
 */
@Injectable()
export class RotationEngine {
  constructor(private readonly readingOrderRegistry: ReadingOrderRegistry) {}

  /** Applies the rotation sequence to every pivot block, in traversal order. */
  encode(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
  ): ColorGrid {
    return this.applyToBlocks(
      grid,
      pivotBlockSize,
      rotationSequence,
      direction,
      readingOrder,
      false,
    );
  }

  /**
   * Applies the inverse rotation sequence to every pivot block, in reverse
   * traversal order.
   */
  decode(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
  ): ColorGrid {
    return this.applyToBlocks(
      grid,
      pivotBlockSize,
      rotationSequence,
      direction,
      readingOrder,
      true,
    );
  }

  private applyToBlocks(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
    inverse: boolean,
  ): ColorGrid {
    const widthInBlocks = grid[0].length / pivotBlockSize;
    const heightInBlocks = grid.length / pivotBlockSize;
    const strategy = this.readingOrderRegistry.getStrategy(readingOrder);
    const blockOrder = strategy.getBlockOrder(widthInBlocks, heightInBlocks);

    const result: ColorGrid = grid.map((row) => [...row]);
    const effectiveDirection: RotationDirection = inverse
      ? direction === 'cw'
        ? 'ccw'
        : 'cw'
      : direction;

    const indices = [...blockOrder.keys()];
    const orderedIndices = inverse ? indices.reverse() : indices;

    for (const i of orderedIndices) {
      const { x, y } = blockOrder[i];
      const angle =
        ROTATION_ANGLES[rotationSequence[i % rotationSequence.length]];
      const caseX = x * pivotBlockSize;
      const caseY = y * pivotBlockSize;

      const block = extractBlock(grid, caseX, caseY, pivotBlockSize);
      const rotated = rotateBlock(block, angle, effectiveDirection);
      writeBlock(result, caseX, caseY, pivotBlockSize, rotated);
    }

    return result;
  }
}

function extractBlock(
  grid: ColorGrid,
  x: number,
  y: number,
  size: number,
): ColorGrid {
  const block: ColorGrid = [];
  for (let dy = 0; dy < size; dy++) {
    const row: string[] = [];
    for (let dx = 0; dx < size; dx++) {
      row.push(grid[y + dy][x + dx]);
    }
    block.push(row);
  }
  return block;
}

function writeBlock(
  grid: ColorGrid,
  x: number,
  y: number,
  size: number,
  block: ColorGrid,
): void {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      grid[y + dy][x + dx] = block[dy][dx];
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest rotation/rotation-engine.spec.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Wire RotationEngine into the NestJS module**

Replace the full contents of `backend/src/rotation/rotation.module.ts`:

```typescript
// backend/src/rotation/rotation.module.ts
import { Module } from '@nestjs/common';
import { ReadingOrderModule } from '../reading-order/reading-order.module';
import { RotationEngine } from './rotation-engine';

@Module({
  imports: [ReadingOrderModule],
  providers: [RotationEngine],
  exports: [RotationEngine],
})
export class RotationModule {}
```

- [ ] **Step 6: Write the module-wiring test**

```typescript
// backend/src/rotation/rotation.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RotationModule } from './rotation.module';
import { RotationEngine } from './rotation-engine';

describe('RotationModule', () => {
  it('exposes RotationEngine, with ReadingOrderRegistry injected, to importing modules', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RotationModule],
    }).compile();

    expect(moduleRef.get(RotationEngine)).toBeInstanceOf(RotationEngine);
  });
});
```

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites (Tasks 1-3 combined) plus every pre-existing suite, no regressions.

- [ ] **Step 8: Commit**

```bash
git add backend/src/rotation/rotation-engine.ts backend/src/rotation/rotation-engine.spec.ts backend/src/rotation/rotation.module.ts backend/src/rotation/rotation.module.spec.ts
git commit -m "$(cat <<'EOF'
feat(rotation): implement RotationEngine and wire it into the module

Modified files:
- backend/src/rotation/rotation-engine.ts - encode/decode over a full grid: divides it into pivot blocks, traverses them via ReadingOrderRegistry, applies (or inverts) the rotation sequence with cycling
- backend/src/rotation/rotation-engine.spec.ts - 15 tests matching docs/tests/rotation.md section 2 one-to-one (encode ordering/cycling/direction, decode inversion, round-trip across grid shapes and sequences)
- backend/src/rotation/rotation.module.ts - register RotationEngine as a provider/export, import ReadingOrderModule
- backend/src/rotation/rotation.module.spec.ts - NestJS DI wiring test
EOF
)"
```

---

## After this plan

Update `BACKLOG.md` (`FEAT-007` status `ready` -> `done`) in the same PR, push `feat/FEAT-007-rotation-engine`, and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-008** (cryptogram metadata header). Read `docs/tests/cipher.md` section 5 before planning it (it is already covered in the same doc consulted for FEAT-006, but re-read section 5 specifically since it was not implemented then).
