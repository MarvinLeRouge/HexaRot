# FEAT-005 - Reading order strategies - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `ReadingOrderStrategy` interface and its four V1 concrete strategies (LR-TB, RL-TB, TB-LR, BT-LR), each with an `alternate` (boustrophedon) modifier, plus a registry that resolves a key-codec `ReadingOrder` value to its strategy instance.

**Architecture:** Each strategy is a plain class implementing `ReadingOrderStrategy.getBlockOrder(widthInBlocks, heightInBlocks): BlockCoordinate[]` - a pure function over block-grid dimensions (not case dimensions), with no NestJS DI dependencies of its own. A `ReadingOrderRegistry` (an injectable, following the `KeyModule`/`KeyCodec` precedent) maps all 8 `ReadingOrder` string values to a strategy instance. The `ReadingOrder` type currently lives in `key-codec.ts`; this plan relocates it to be owned by the reading-order module (its natural home) and has `key-codec.ts` import and re-export it, so existing consumers (`key-codec.spec.ts`) are unaffected.

**Tech Stack:** TypeScript (strict), NestJS (for the registry only), Jest + ts-jest. Jest `rootDir` is `backend/src`.

## Global Constraints

- TypeScript strict mode, no implicit any.
- Code, comments, commit messages: English. Comments only where the WHY isn't obvious from the code.
- Functions/methods verb-first, camelCase; classes PascalCase; files kebab-case.
- Conventional Commits format, with the mandatory "Modified files:" list.
- No em dash, en dash used as a hyphen, curly quotes, or other non-ASCII punctuation anywhere you write - code, comments, docstrings, or commit messages. Plain hyphen `-` only.
- Branch: `feat/FEAT-005-reading-order-strategies`, created from up-to-date `main`.
- **Must not change behavior of `KeyCodec.encode`/`decode`/`validate`.** `key-codec.ts`'s `READING_ORDERS` array, its index order, and the bit-packing logic are untouched - only the `ReadingOrder` *type declaration* moves to be imported from elsewhere. `backend/src/key/key-codec.spec.ts` (24 existing tests) must continue to pass unmodified as a regression check.
- Coordinates are `{ x, y }` where `x` is the column (0 = leftmost) and `y` is the row (0 = topmost) - same convention as `ColorGrid`'s `grid[row][col]` (y = row, x = col), documented at `backend/src/shared/types/color-grid.type.ts`.
- "Alternate" means boustrophedon: the traversal direction flips on every second row (LR-TB/RL-TB) or column (TB-LR/BT-LR), starting unreversed at index 0. This is a full zigzag, not just "row/column 1 reversed, everything else the same."
- Padding block placement is NOT this plan's concern: a strategy just returns the complete, non-repeating traversal order for the whole block grid. Wherever a later stage's message content runs out is implicitly "the end" of that order - there is no separate padding parameter or return value here.

---

## File Structure

- Create: `backend/src/reading-order/reading-order-strategy.interface.ts` - `ReadingOrder` type (relocated from `key-codec.ts`), `BlockCoordinate` type, `ReadingOrderStrategy` interface.
- Create: `backend/src/reading-order/strategies/lr-tb.strategy.ts` + spec - left-to-right, top-to-bottom.
- Create: `backend/src/reading-order/strategies/rl-tb.strategy.ts` + spec - right-to-left, top-to-bottom.
- Create: `backend/src/reading-order/strategies/tb-lr.strategy.ts` + spec - top-to-bottom, left-to-right.
- Create: `backend/src/reading-order/strategies/bt-lr.strategy.ts` + spec - bottom-to-top, left-to-right.
- Create: `backend/src/reading-order/reading-order.registry.ts` + spec - resolves a `ReadingOrder` value to its strategy instance.
- Create: `backend/src/reading-order/reading-order-invariants.spec.ts` - cross-strategy coverage tests (every block covered exactly once, across all 8 orders and several grid sizes including 1xN and Nx1).
- Modify: `backend/src/key/key-codec.ts` - replace the inline `ReadingOrder` type declaration with an import + re-export from the new interface file.
- Modify: `backend/src/reading-order/reading-order.module.ts` - register `ReadingOrderRegistry` as a provider/export.

---

### Task 1: Interface, LR-TB and RL-TB strategies, key-codec integration

**Files:**
- Create: `backend/src/reading-order/reading-order-strategy.interface.ts`
- Create: `backend/src/reading-order/strategies/lr-tb.strategy.ts`
- Test: `backend/src/reading-order/strategies/lr-tb.strategy.spec.ts`
- Create: `backend/src/reading-order/strategies/rl-tb.strategy.ts`
- Test: `backend/src/reading-order/strategies/rl-tb.strategy.spec.ts`
- Modify: `backend/src/key/key-codec.ts`

**Interfaces:**
- Produces: `ReadingOrder` type (8 literals: `'LR-TB' | 'RL-TB' | 'TB-LR' | 'BT-LR' | 'LR-TB-ALT' | 'RL-TB-ALT' | 'TB-LR-ALT' | 'BT-LR-ALT'`), `BlockCoordinate` (`{ x: number; y: number }`), `ReadingOrderStrategy` interface (`readonly id: ReadingOrder`, `getBlockOrder(widthInBlocks: number, heightInBlocks: number): BlockCoordinate[]`). `LrTbStrategy` and `RlTbStrategy` classes, both `constructor(private readonly alternate: boolean = false)`.
- Consumes (Task 2 and 3 depend on this): the interface file's three exports, imported as `../reading-order-strategy.interface` from within `strategies/`, or `./reading-order-strategy.interface` from `reading-order/` directly.

- [x] **Step 1: Write the failing tests**

```typescript
// backend/src/reading-order/strategies/lr-tb.strategy.spec.ts
import { LrTbStrategy } from './lr-tb.strategy';

describe('LrTbStrategy', () => {
  it('exposes id "LR-TB" when not alternate', () => {
    expect(new LrTbStrategy().id).toBe('LR-TB');
  });

  it('exposes id "LR-TB-ALT" when alternate', () => {
    expect(new LrTbStrategy(true).id).toBe('LR-TB-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new LrTbStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });
});
```

```typescript
// backend/src/reading-order/strategies/rl-tb.strategy.spec.ts
import { RlTbStrategy } from './rl-tb.strategy';

describe('RlTbStrategy', () => {
  it('exposes id "RL-TB" when not alternate', () => {
    expect(new RlTbStrategy().id).toBe('RL-TB');
  });

  it('exposes id "RL-TB-ALT" when alternate', () => {
    expect(new RlTbStrategy(true).id).toBe('RL-TB-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
      { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 },
      { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new RlTbStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
      { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
    ]);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/strategies/lr-tb.strategy.spec.ts reading-order/strategies/rl-tb.strategy.spec.ts`
Expected: FAIL - `Cannot find module './lr-tb.strategy'` / `'./rl-tb.strategy'`

- [x] **Step 3: Create the interface file**

```typescript
// backend/src/reading-order/reading-order-strategy.interface.ts

/**
 * V1 reading orders supported by the HexaRot cipher.
 * The `-ALT` suffix denotes the alternate (boustrophedon) modifier, which
 * reverses the traversal direction at each new row or column.
 */
export type ReadingOrder =
  | 'LR-TB'
  | 'RL-TB'
  | 'TB-LR'
  | 'BT-LR'
  | 'LR-TB-ALT'
  | 'RL-TB-ALT'
  | 'TB-LR-ALT'
  | 'BT-LR-ALT';

/** A single block's position in the block grid (not case coordinates). */
export interface BlockCoordinate {
  x: number;
  y: number;
}

/**
 * Produces the traversal order of pivot blocks across a block grid.
 *
 * Implementations cover every block in the grid exactly once. Padding
 * blocks (added during grid construction) always occupy the trailing
 * positions of whichever block ends up last in the returned sequence -
 * there is no separate padding concept at this layer.
 */
export interface ReadingOrderStrategy {
  /** The reading order this strategy implements. */
  readonly id: ReadingOrder;

  /**
   * Returns every block coordinate in this strategy's traversal order.
   *
   * @param widthInBlocks - Grid width, in pivot blocks (not cases).
   * @param heightInBlocks - Grid height, in pivot blocks (not cases).
   */
  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[];
}
```

- [x] **Step 4: Implement LrTbStrategy and RlTbStrategy**

```typescript
// backend/src/reading-order/strategies/lr-tb.strategy.ts
import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Left-to-right, top-to-bottom block traversal.
 * With `alternate`, direction flips to right-to-left on every second row
 * (boustrophedon), starting with row 0 unreversed.
 */
export class LrTbStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'LR-TB-ALT' : 'LR-TB';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let y = 0; y < heightInBlocks; y++) {
      const reversed = this.alternate && y % 2 === 1;
      if (reversed) {
        for (let x = widthInBlocks - 1; x >= 0; x--) coords.push({ x, y });
      } else {
        for (let x = 0; x < widthInBlocks; x++) coords.push({ x, y });
      }
    }
    return coords;
  }
}
```

```typescript
// backend/src/reading-order/strategies/rl-tb.strategy.ts
import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Right-to-left, top-to-bottom block traversal.
 * With `alternate`, direction flips to left-to-right on every second row
 * (boustrophedon), starting with row 0 unreversed.
 */
export class RlTbStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'RL-TB-ALT' : 'RL-TB';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let y = 0; y < heightInBlocks; y++) {
      const reversed = this.alternate && y % 2 === 1;
      if (reversed) {
        for (let x = 0; x < widthInBlocks; x++) coords.push({ x, y });
      } else {
        for (let x = widthInBlocks - 1; x >= 0; x--) coords.push({ x, y });
      }
    }
    return coords;
  }
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/strategies/lr-tb.strategy.spec.ts reading-order/strategies/rl-tb.strategy.spec.ts`
Expected: PASS (12 tests: 6 per file)

- [x] **Step 6: Relocate `ReadingOrder` into `key-codec.ts` as an import + re-export**

Open `backend/src/key/key-codec.ts`. Replace this block (currently lines 1-14):

```typescript
/**
 * V1 reading orders supported by the HexaRot cipher.
 * The `-ALT` suffix denotes the alternate modifier, which reverses the
 * traversal direction at each new row or column.
 */
export type ReadingOrder =
  | 'LR-TB'
  | 'RL-TB'
  | 'TB-LR'
  | 'BT-LR'
  | 'LR-TB-ALT'
  | 'RL-TB-ALT'
  | 'TB-LR-ALT'
  | 'BT-LR-ALT';
```

with:

```typescript
import type { ReadingOrder } from '../reading-order/reading-order-strategy.interface';

export type { ReadingOrder };
```

Do not change anything else in the file - `RotationSequence`, `KeyParams`, `READING_ORDERS`, `ROTATION_SEQUENCES`, `pack`/`unpack`, and the `KeyCodec` class all stay exactly as they are. This is a pure type-relocation with a re-export; `key-codec.spec.ts` imports `ReadingOrder` from `'./key-codec'` and must keep working without any change to that file.

- [x] **Step 7: Run the full backend suite to confirm no regression**

Run: `cd backend && npm run test`
Expected: PASS, all suites including the unmodified `key-codec.spec.ts` (24 tests) plus the 2 new spec files.

- [x] **Step 8: Commit**

```bash
git add backend/src/reading-order/reading-order-strategy.interface.ts backend/src/reading-order/strategies/lr-tb.strategy.ts backend/src/reading-order/strategies/lr-tb.strategy.spec.ts backend/src/reading-order/strategies/rl-tb.strategy.ts backend/src/reading-order/strategies/rl-tb.strategy.spec.ts backend/src/key/key-codec.ts
git commit -m "$(cat <<'EOF'
feat(reading-order): add ReadingOrderStrategy interface, LR-TB and RL-TB strategies

Modified files:
- backend/src/reading-order/reading-order-strategy.interface.ts - new ReadingOrder type, BlockCoordinate, ReadingOrderStrategy interface
- backend/src/reading-order/strategies/lr-tb.strategy.ts, backend/src/reading-order/strategies/lr-tb.strategy.spec.ts - left-to-right, top-to-bottom strategy with alternate (boustrophedon) support
- backend/src/reading-order/strategies/rl-tb.strategy.ts, backend/src/reading-order/strategies/rl-tb.strategy.spec.ts - right-to-left, top-to-bottom strategy with alternate support
- backend/src/key/key-codec.ts - relocate ReadingOrder type to be owned by the reading-order module, re-exported for existing consumers
EOF
)"
```

---

### Task 2: TB-LR and BT-LR strategies

**Files:**
- Create: `backend/src/reading-order/strategies/tb-lr.strategy.ts`
- Test: `backend/src/reading-order/strategies/tb-lr.strategy.spec.ts`
- Create: `backend/src/reading-order/strategies/bt-lr.strategy.ts`
- Test: `backend/src/reading-order/strategies/bt-lr.strategy.spec.ts`

**Interfaces:**
- Consumes: `BlockCoordinate`, `ReadingOrder`, `ReadingOrderStrategy` from `../reading-order-strategy.interface` (Task 1).
- Produces: `TbLrStrategy`, `BtLrStrategy` classes, same shape as Task 1's strategies (`constructor(private readonly alternate: boolean = false)`, `readonly id`, `getBlockOrder`).

- [x] **Step 1: Write the failing tests**

```typescript
// backend/src/reading-order/strategies/tb-lr.strategy.spec.ts
import { TbLrStrategy } from './tb-lr.strategy';

describe('TbLrStrategy', () => {
  it('exposes id "TB-LR" when not alternate', () => {
    expect(new TbLrStrategy().id).toBe('TB-LR');
  });

  it('exposes id "TB-LR-ALT" when alternate', () => {
    expect(new TbLrStrategy(true).id).toBe('TB-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new TbLrStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 },
      { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 },
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });
});
```

```typescript
// backend/src/reading-order/strategies/bt-lr.strategy.spec.ts
import { BtLrStrategy } from './bt-lr.strategy';

describe('BtLrStrategy', () => {
  it('exposes id "BT-LR" when not alternate', () => {
    expect(new BtLrStrategy().id).toBe('BT-LR');
  });

  it('exposes id "BT-LR-ALT" when alternate', () => {
    expect(new BtLrStrategy(true).id).toBe('BT-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
      { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 },
      { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new BtLrStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/strategies/tb-lr.strategy.spec.ts reading-order/strategies/bt-lr.strategy.spec.ts`
Expected: FAIL - `Cannot find module './tb-lr.strategy'` / `'./bt-lr.strategy'`

- [x] **Step 3: Implement TbLrStrategy and BtLrStrategy**

```typescript
// backend/src/reading-order/strategies/tb-lr.strategy.ts
import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Top-to-bottom, left-to-right block traversal (columns first).
 * With `alternate`, direction flips to bottom-to-top on every second column
 * (boustrophedon), starting with column 0 unreversed.
 */
export class TbLrStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'TB-LR-ALT' : 'TB-LR';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let x = 0; x < widthInBlocks; x++) {
      const reversed = this.alternate && x % 2 === 1;
      if (reversed) {
        for (let y = heightInBlocks - 1; y >= 0; y--) coords.push({ x, y });
      } else {
        for (let y = 0; y < heightInBlocks; y++) coords.push({ x, y });
      }
    }
    return coords;
  }
}
```

```typescript
// backend/src/reading-order/strategies/bt-lr.strategy.ts
import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Bottom-to-top, left-to-right block traversal (columns first).
 * With `alternate`, direction flips to top-to-bottom on every second column
 * (boustrophedon), starting with column 0 unreversed.
 */
export class BtLrStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'BT-LR-ALT' : 'BT-LR';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let x = 0; x < widthInBlocks; x++) {
      const reversed = this.alternate && x % 2 === 1;
      if (reversed) {
        for (let y = 0; y < heightInBlocks; y++) coords.push({ x, y });
      } else {
        for (let y = heightInBlocks - 1; y >= 0; y--) coords.push({ x, y });
      }
    }
    return coords;
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/strategies/tb-lr.strategy.spec.ts reading-order/strategies/bt-lr.strategy.spec.ts`
Expected: PASS (12 tests: 6 per file)

- [x] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including Task 1's files, no regressions.

- [x] **Step 6: Commit**

```bash
git add backend/src/reading-order/strategies/tb-lr.strategy.ts backend/src/reading-order/strategies/tb-lr.strategy.spec.ts backend/src/reading-order/strategies/bt-lr.strategy.ts backend/src/reading-order/strategies/bt-lr.strategy.spec.ts
git commit -m "$(cat <<'EOF'
feat(reading-order): add TB-LR and BT-LR strategies

Modified files:
- backend/src/reading-order/strategies/tb-lr.strategy.ts, backend/src/reading-order/strategies/tb-lr.strategy.spec.ts - top-to-bottom, left-to-right strategy with alternate (boustrophedon) support
- backend/src/reading-order/strategies/bt-lr.strategy.ts, backend/src/reading-order/strategies/bt-lr.strategy.spec.ts - bottom-to-top, left-to-right strategy with alternate support
EOF
)"
```

---

### Task 3: ReadingOrderRegistry, module wiring, cross-strategy invariants

**Files:**
- Create: `backend/src/reading-order/reading-order.registry.ts`
- Test: `backend/src/reading-order/reading-order.registry.spec.ts`
- Create: `backend/src/reading-order/reading-order-invariants.spec.ts`
- Modify: `backend/src/reading-order/reading-order.module.ts`

**Interfaces:**
- Consumes: `ReadingOrder`, `ReadingOrderStrategy` from `./reading-order-strategy.interface`; `LrTbStrategy`, `RlTbStrategy` from Task 1; `TbLrStrategy`, `BtLrStrategy` from Task 2.
- Produces: `export class ReadingOrderRegistry` with `getStrategy(order: ReadingOrder): ReadingOrderStrategy`. This is the integration point later tasks (FEAT-006 grid construction, FEAT-007 rotation engine) will inject to resolve a key's `readingOrder` value to a usable strategy.

- [x] **Step 1: Write the failing tests**

```typescript
// backend/src/reading-order/reading-order.registry.spec.ts
import { ReadingOrderRegistry } from './reading-order.registry';
import { LrTbStrategy } from './strategies/lr-tb.strategy';
import { RlTbStrategy } from './strategies/rl-tb.strategy';
import { TbLrStrategy } from './strategies/tb-lr.strategy';
import { BtLrStrategy } from './strategies/bt-lr.strategy';

describe('ReadingOrderRegistry', () => {
  let registry: ReadingOrderRegistry;

  beforeEach(() => {
    registry = new ReadingOrderRegistry();
  });

  it('resolves LR-TB to a non-alternate LrTbStrategy', () => {
    const strategy = registry.getStrategy('LR-TB');
    expect(strategy).toBeInstanceOf(LrTbStrategy);
    expect(strategy.id).toBe('LR-TB');
  });

  it('resolves LR-TB-ALT to an alternate LrTbStrategy', () => {
    const strategy = registry.getStrategy('LR-TB-ALT');
    expect(strategy).toBeInstanceOf(LrTbStrategy);
    expect(strategy.id).toBe('LR-TB-ALT');
  });

  it('resolves RL-TB to a non-alternate RlTbStrategy', () => {
    const strategy = registry.getStrategy('RL-TB');
    expect(strategy).toBeInstanceOf(RlTbStrategy);
    expect(strategy.id).toBe('RL-TB');
  });

  it('resolves RL-TB-ALT to an alternate RlTbStrategy', () => {
    const strategy = registry.getStrategy('RL-TB-ALT');
    expect(strategy).toBeInstanceOf(RlTbStrategy);
    expect(strategy.id).toBe('RL-TB-ALT');
  });

  it('resolves TB-LR to a non-alternate TbLrStrategy', () => {
    const strategy = registry.getStrategy('TB-LR');
    expect(strategy).toBeInstanceOf(TbLrStrategy);
    expect(strategy.id).toBe('TB-LR');
  });

  it('resolves TB-LR-ALT to an alternate TbLrStrategy', () => {
    const strategy = registry.getStrategy('TB-LR-ALT');
    expect(strategy).toBeInstanceOf(TbLrStrategy);
    expect(strategy.id).toBe('TB-LR-ALT');
  });

  it('resolves BT-LR to a non-alternate BtLrStrategy', () => {
    const strategy = registry.getStrategy('BT-LR');
    expect(strategy).toBeInstanceOf(BtLrStrategy);
    expect(strategy.id).toBe('BT-LR');
  });

  it('resolves BT-LR-ALT to an alternate BtLrStrategy', () => {
    const strategy = registry.getStrategy('BT-LR-ALT');
    expect(strategy).toBeInstanceOf(BtLrStrategy);
    expect(strategy.id).toBe('BT-LR-ALT');
  });
});
```

```typescript
// backend/src/reading-order/reading-order-invariants.spec.ts
import { ReadingOrderRegistry } from './reading-order.registry';
import { ReadingOrder } from './reading-order-strategy.interface';

const ALL_READING_ORDERS: ReadingOrder[] = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

const GRID_SIZES: [number, number][] = [
  [3, 3],
  [1, 4],
  [4, 1],
  [2, 5],
  [5, 2],
];

describe('Reading order strategies - coverage invariants', () => {
  let registry: ReadingOrderRegistry;

  beforeEach(() => {
    registry = new ReadingOrderRegistry();
  });

  for (const order of ALL_READING_ORDERS) {
    for (const [width, height] of GRID_SIZES) {
      it(`${order} covers every block exactly once on a ${width}x${height} grid`, () => {
        const strategy = registry.getStrategy(order);
        const result = strategy.getBlockOrder(width, height);

        expect(result).toHaveLength(width * height);

        const seen = new Set(result.map(({ x, y }) => `${x},${y}`));
        expect(seen.size).toBe(width * height);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            expect(seen.has(`${x},${y}`)).toBe(true);
          }
        }
      });
    }
  }
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/reading-order.registry.spec.ts reading-order/reading-order-invariants.spec.ts`
Expected: FAIL - `Cannot find module './reading-order.registry'`

- [x] **Step 3: Implement ReadingOrderRegistry**

```typescript
// backend/src/reading-order/reading-order.registry.ts
import { Injectable } from '@nestjs/common';
import {
  ReadingOrder,
  ReadingOrderStrategy,
} from './reading-order-strategy.interface';
import { LrTbStrategy } from './strategies/lr-tb.strategy';
import { RlTbStrategy } from './strategies/rl-tb.strategy';
import { TbLrStrategy } from './strategies/tb-lr.strategy';
import { BtLrStrategy } from './strategies/bt-lr.strategy';

/**
 * Resolves a key-codec ReadingOrder value to its concrete
 * ReadingOrderStrategy implementation.
 */
@Injectable()
export class ReadingOrderRegistry {
  private readonly strategies: Record<ReadingOrder, ReadingOrderStrategy> = {
    'LR-TB': new LrTbStrategy(false),
    'RL-TB': new RlTbStrategy(false),
    'TB-LR': new TbLrStrategy(false),
    'BT-LR': new BtLrStrategy(false),
    'LR-TB-ALT': new LrTbStrategy(true),
    'RL-TB-ALT': new RlTbStrategy(true),
    'TB-LR-ALT': new TbLrStrategy(true),
    'BT-LR-ALT': new BtLrStrategy(true),
  };

  /** Returns the strategy implementing the given reading order. */
  getStrategy(order: ReadingOrder): ReadingOrderStrategy {
    return this.strategies[order];
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/reading-order.registry.spec.ts reading-order/reading-order-invariants.spec.ts`
Expected: PASS (8 tests in registry.spec.ts + 40 tests in invariants.spec.ts, 8 orders x 5 grid sizes)

- [x] **Step 5: Wire the registry into the NestJS module**

Replace the full contents of `backend/src/reading-order/reading-order.module.ts`:

```typescript
// backend/src/reading-order/reading-order.module.ts
import { Module } from '@nestjs/common';
import { ReadingOrderRegistry } from './reading-order.registry';

@Module({
  providers: [ReadingOrderRegistry],
  exports: [ReadingOrderRegistry],
})
export class ReadingOrderModule {}
```

- [x] **Step 6: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites (Tasks 1, 2, 3 combined) plus every pre-existing suite, no regressions.

- [x] **Step 7: Commit**

```bash
git add backend/src/reading-order/reading-order.registry.ts backend/src/reading-order/reading-order.registry.spec.ts backend/src/reading-order/reading-order-invariants.spec.ts backend/src/reading-order/reading-order.module.ts
git commit -m "$(cat <<'EOF'
feat(reading-order): add ReadingOrderRegistry and wire it into the module

Modified files:
- backend/src/reading-order/reading-order.registry.ts, backend/src/reading-order/reading-order.registry.spec.ts - resolves a ReadingOrder value to its strategy instance
- backend/src/reading-order/reading-order-invariants.spec.ts - cross-strategy coverage tests: every block covered exactly once, across all 8 reading orders and 5 grid sizes including 1xN and Nx1
- backend/src/reading-order/reading-order.module.ts - register ReadingOrderRegistry as a provider/export
EOF
)"
```

---

## Post-review addendum (final whole-branch review)

Tasks 1-3 above were implemented, task-reviewed, and passed a final whole-branch review with zero
Critical/Important functional defects (the `key-codec.ts` relocation was independently re-verified
with 3072 exhaustive encode/decode round-trips; full suite 157/157, 100% branch coverage on new code).

That review also discovered `docs/tests/reading-order.md` - a pre-existing, git-tracked, spec-first
test contract for this exact backlog item that the original plan never consulted (it isn't referenced
from `CLAUDE.md` or `CONTEXT.md`, only from `docs/tests/index.md`'s own Backlog Correspondence table).
The shipped tests contradict it on three points: `reading-order-invariants.spec.ts` uses a shared
parameterised loop, which `docs/tests/index.md` section 4 explicitly forbids ("no logic in tests: no
loops, no conditionals - one assertion path per `it`"; `docs/tests/reading-order.md` section 1 adds
"tested for each strategy individually - do not rely on a shared loop in tests"); no test covers a
1x1 grid, which section 1 requires; and no `__fixtures__/reading-order.fixtures.ts` exists, which the
doc's Fixtures section requires for the shared grid sizes and expected 3x3 sequences.

The user's decision (2026-08-05): bring the branch into full compliance with the existing doc rather
than amend the doc to match what shipped - the project's stated methodology is spec-first ("tests are
the contract; implementation is the fulfilment"), and the doc predates this branch by months.

Tasks 4 and 5 below implement that compliance work, plus one small, unrelated-but-cheap fix the final
review also flagged (Task 5, `reading-order.module.ts` had 0% coverage since every test constructs
`ReadingOrderRegistry` directly instead of through Nest's DI container).

**Design note carried into Task 4:** `docs/tests/index.md`'s "no loops, no conditionals" rule is read
here as constraining the *body of each `it` block* to a single straight-line assertion path - not as
forbidding a well-named, pure helper function (itself allowed to loop) called once from within an
`it`. Bullets 1-4 of `docs/tests/reading-order.md` section 1 (coverage on four different grid sizes)
share one helper, `expectCoversEveryBlockExactlyOnce`, defined once in the new fixtures file and
called with one line per grid size. Bullets 5-7 (length, bounds, duplicates) are each written as a
single inline `expect(...)` using `.every()`/`.map()` (functional expressions, not `for`/`while`/`if`
control-flow statements) rather than a shared helper, since each is naturally a one-liner already.
If this reading turns out to be wrong, the task reviewer should flag it explicitly as a finding rather
than silently accept it - it is a judgement call on ambiguous doc wording, not a settled interpretation.

### Task 4: Fixtures file and per-strategy invariant tests, no shared loop

**Files:**
- Create: `backend/src/reading-order/__fixtures__/reading-order.fixtures.ts`
- Modify: `backend/src/reading-order/strategies/lr-tb.strategy.spec.ts`
- Modify: `backend/src/reading-order/strategies/rl-tb.strategy.spec.ts`
- Modify: `backend/src/reading-order/strategies/tb-lr.strategy.spec.ts`
- Modify: `backend/src/reading-order/strategies/bt-lr.strategy.spec.ts`
- Delete: `backend/src/reading-order/reading-order-invariants.spec.ts`

**Interfaces:**
- Consumes: `BlockCoordinate` from `../reading-order-strategy.interface`; the four strategy classes (already built, unchanged).
- Produces: `GRID_3x3`, `GRID_1x5`, `GRID_5x1`, `GRID_1x1` (`{ width: number; height: number }`), `EXPECTED_LR_TB_3x3`, `EXPECTED_LR_TB_ALT_3x3`, `EXPECTED_RL_TB_3x3`, `EXPECTED_RL_TB_ALT_3x3`, `EXPECTED_TB_LR_3x3`, `EXPECTED_TB_LR_ALT_3x3`, `EXPECTED_BT_LR_3x3`, `EXPECTED_BT_LR_ALT_3x3` (all `BlockCoordinate[]`), and `expectCoversEveryBlockExactlyOnce(coordinates: BlockCoordinate[], width: number, height: number): void`.

- [ ] **Step 1: Create the fixtures file**

```typescript
// backend/src/reading-order/__fixtures__/reading-order.fixtures.ts
import { BlockCoordinate } from '../reading-order-strategy.interface';

/** Grid dimensions shared across reading-order test suites. */
export const GRID_3x3 = { width: 3, height: 3 };
export const GRID_1x5 = { width: 1, height: 5 };
export const GRID_5x1 = { width: 5, height: 1 };
export const GRID_1x1 = { width: 1, height: 1 };

export const EXPECTED_LR_TB_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
];

export const EXPECTED_LR_TB_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
];

export const EXPECTED_RL_TB_3x3: BlockCoordinate[] = [
  { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
  { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
];

export const EXPECTED_RL_TB_ALT_3x3: BlockCoordinate[] = [
  { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
];

export const EXPECTED_TB_LR_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 },
  { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
  { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
];

export const EXPECTED_TB_LR_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 },
  { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 },
  { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
];

export const EXPECTED_BT_LR_3x3: BlockCoordinate[] = [
  { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
  { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 },
  { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
];

export const EXPECTED_BT_LR_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
  { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
  { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
];

/**
 * Asserts a strategy's output covers every block in a widthxheight grid
 * exactly once: correct count, no duplicates, no omissions. Loops here are
 * fine - this is test-support code, not the body of an `it` block.
 */
export function expectCoversEveryBlockExactlyOnce(
  coordinates: BlockCoordinate[],
  width: number,
  height: number,
): void {
  expect(coordinates).toHaveLength(width * height);
  const seen = new Set(coordinates.map(({ x, y }) => `${x},${y}`));
  expect(seen.size).toBe(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      expect(seen.has(`${x},${y}`)).toBe(true);
    }
  }
}
```

- [ ] **Step 2: Rewrite `lr-tb.strategy.spec.ts` to use fixtures and add the invariants block**

Replace the full file contents:

```typescript
// backend/src/reading-order/strategies/lr-tb.strategy.spec.ts
import { LrTbStrategy } from './lr-tb.strategy';
import {
  GRID_3x3,
  GRID_1x5,
  GRID_5x1,
  GRID_1x1,
  EXPECTED_LR_TB_3x3,
  EXPECTED_LR_TB_ALT_3x3,
  expectCoversEveryBlockExactlyOnce,
} from '../__fixtures__/reading-order.fixtures';

describe('LrTbStrategy', () => {
  it('exposes id "LR-TB" when not alternate', () => {
    expect(new LrTbStrategy().id).toBe('LR-TB');
  });

  it('exposes id "LR-TB-ALT" when alternate', () => {
    expect(new LrTbStrategy(true).id).toBe('LR-TB-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_LR_TB_3x3,
    );
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new LrTbStrategy(true);
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_LR_TB_ALT_3x3,
    );
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });

  describe('LrTbStrategy - invariants', () => {
    it('covers every block exactly once for a 3x3 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new LrTbStrategy().getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });

    it('covers every block exactly once for a 1x5 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new LrTbStrategy().getBlockOrder(GRID_1x5.width, GRID_1x5.height),
        GRID_1x5.width,
        GRID_1x5.height,
      );
    });

    it('covers every block exactly once for a 5x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new LrTbStrategy().getBlockOrder(GRID_5x1.width, GRID_5x1.height),
        GRID_5x1.width,
        GRID_5x1.height,
      );
    });

    it('covers every block exactly once for a 1x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new LrTbStrategy().getBlockOrder(GRID_1x1.width, GRID_1x1.height),
        GRID_1x1.width,
        GRID_1x1.height,
      );
    });

    it('returns a sequence of length gridWidth x gridHeight', () => {
      const result = new LrTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(result).toHaveLength(GRID_3x3.width * GRID_3x3.height);
    });

    it('returns no coordinate outside the grid bounds', () => {
      const result = new LrTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(
        result.every(
          ({ x, y }) =>
            x >= 0 && x < GRID_3x3.width && y >= 0 && y < GRID_3x3.height,
        ),
      ).toBe(true);
    });

    it('returns no duplicate coordinates', () => {
      const result = new LrTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(new Set(result.map(({ x, y }) => `${x},${y}`)).size).toBe(
        result.length,
      );
    });

    it('satisfies the common invariants with alternate active', () => {
      expectCoversEveryBlockExactlyOnce(
        new LrTbStrategy(true).getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });
  });
});
```

- [ ] **Step 3: Rewrite `rl-tb.strategy.spec.ts` the same way**

Replace the full file contents:

```typescript
// backend/src/reading-order/strategies/rl-tb.strategy.spec.ts
import { RlTbStrategy } from './rl-tb.strategy';
import {
  GRID_3x3,
  GRID_1x5,
  GRID_5x1,
  GRID_1x1,
  EXPECTED_RL_TB_3x3,
  EXPECTED_RL_TB_ALT_3x3,
  expectCoversEveryBlockExactlyOnce,
} from '../__fixtures__/reading-order.fixtures';

describe('RlTbStrategy', () => {
  it('exposes id "RL-TB" when not alternate', () => {
    expect(new RlTbStrategy().id).toBe('RL-TB');
  });

  it('exposes id "RL-TB-ALT" when alternate', () => {
    expect(new RlTbStrategy(true).id).toBe('RL-TB-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_RL_TB_3x3,
    );
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new RlTbStrategy(true);
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_RL_TB_ALT_3x3,
    );
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new RlTbStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
    ]);
  });

  describe('RlTbStrategy - invariants', () => {
    it('covers every block exactly once for a 3x3 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new RlTbStrategy().getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });

    it('covers every block exactly once for a 1x5 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new RlTbStrategy().getBlockOrder(GRID_1x5.width, GRID_1x5.height),
        GRID_1x5.width,
        GRID_1x5.height,
      );
    });

    it('covers every block exactly once for a 5x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new RlTbStrategy().getBlockOrder(GRID_5x1.width, GRID_5x1.height),
        GRID_5x1.width,
        GRID_5x1.height,
      );
    });

    it('covers every block exactly once for a 1x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new RlTbStrategy().getBlockOrder(GRID_1x1.width, GRID_1x1.height),
        GRID_1x1.width,
        GRID_1x1.height,
      );
    });

    it('returns a sequence of length gridWidth x gridHeight', () => {
      const result = new RlTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(result).toHaveLength(GRID_3x3.width * GRID_3x3.height);
    });

    it('returns no coordinate outside the grid bounds', () => {
      const result = new RlTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(
        result.every(
          ({ x, y }) =>
            x >= 0 && x < GRID_3x3.width && y >= 0 && y < GRID_3x3.height,
        ),
      ).toBe(true);
    });

    it('returns no duplicate coordinates', () => {
      const result = new RlTbStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(new Set(result.map(({ x, y }) => `${x},${y}`)).size).toBe(
        result.length,
      );
    });

    it('satisfies the common invariants with alternate active', () => {
      expectCoversEveryBlockExactlyOnce(
        new RlTbStrategy(true).getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });
  });
});
```

- [ ] **Step 4: Rewrite `tb-lr.strategy.spec.ts` the same way**

Replace the full file contents:

```typescript
// backend/src/reading-order/strategies/tb-lr.strategy.spec.ts
import { TbLrStrategy } from './tb-lr.strategy';
import {
  GRID_3x3,
  GRID_1x5,
  GRID_5x1,
  GRID_1x1,
  EXPECTED_TB_LR_3x3,
  EXPECTED_TB_LR_ALT_3x3,
  expectCoversEveryBlockExactlyOnce,
} from '../__fixtures__/reading-order.fixtures';

describe('TbLrStrategy', () => {
  it('exposes id "TB-LR" when not alternate', () => {
    expect(new TbLrStrategy().id).toBe('TB-LR');
  });

  it('exposes id "TB-LR-ALT" when alternate', () => {
    expect(new TbLrStrategy(true).id).toBe('TB-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_TB_LR_3x3,
    );
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new TbLrStrategy(true);
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_TB_LR_ALT_3x3,
    );
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });

  describe('TbLrStrategy - invariants', () => {
    it('covers every block exactly once for a 3x3 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new TbLrStrategy().getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });

    it('covers every block exactly once for a 1x5 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new TbLrStrategy().getBlockOrder(GRID_1x5.width, GRID_1x5.height),
        GRID_1x5.width,
        GRID_1x5.height,
      );
    });

    it('covers every block exactly once for a 5x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new TbLrStrategy().getBlockOrder(GRID_5x1.width, GRID_5x1.height),
        GRID_5x1.width,
        GRID_5x1.height,
      );
    });

    it('covers every block exactly once for a 1x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new TbLrStrategy().getBlockOrder(GRID_1x1.width, GRID_1x1.height),
        GRID_1x1.width,
        GRID_1x1.height,
      );
    });

    it('returns a sequence of length gridWidth x gridHeight', () => {
      const result = new TbLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(result).toHaveLength(GRID_3x3.width * GRID_3x3.height);
    });

    it('returns no coordinate outside the grid bounds', () => {
      const result = new TbLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(
        result.every(
          ({ x, y }) =>
            x >= 0 && x < GRID_3x3.width && y >= 0 && y < GRID_3x3.height,
        ),
      ).toBe(true);
    });

    it('returns no duplicate coordinates', () => {
      const result = new TbLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(new Set(result.map(({ x, y }) => `${x},${y}`)).size).toBe(
        result.length,
      );
    });

    it('satisfies the common invariants with alternate active', () => {
      expectCoversEveryBlockExactlyOnce(
        new TbLrStrategy(true).getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });
  });
});
```

- [ ] **Step 5: Rewrite `bt-lr.strategy.spec.ts` the same way**

Replace the full file contents:

```typescript
// backend/src/reading-order/strategies/bt-lr.strategy.spec.ts
import { BtLrStrategy } from './bt-lr.strategy';
import {
  GRID_3x3,
  GRID_1x5,
  GRID_5x1,
  GRID_1x1,
  EXPECTED_BT_LR_3x3,
  EXPECTED_BT_LR_ALT_3x3,
  expectCoversEveryBlockExactlyOnce,
} from '../__fixtures__/reading-order.fixtures';

describe('BtLrStrategy', () => {
  it('exposes id "BT-LR" when not alternate', () => {
    expect(new BtLrStrategy().id).toBe('BT-LR');
  });

  it('exposes id "BT-LR-ALT" when alternate', () => {
    expect(new BtLrStrategy(true).id).toBe('BT-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_BT_LR_3x3,
    );
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new BtLrStrategy(true);
    expect(strategy.getBlockOrder(GRID_3x3.width, GRID_3x3.height)).toEqual(
      EXPECTED_BT_LR_ALT_3x3,
    );
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ]);
  });

  describe('BtLrStrategy - invariants', () => {
    it('covers every block exactly once for a 3x3 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new BtLrStrategy().getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });

    it('covers every block exactly once for a 1x5 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new BtLrStrategy().getBlockOrder(GRID_1x5.width, GRID_1x5.height),
        GRID_1x5.width,
        GRID_1x5.height,
      );
    });

    it('covers every block exactly once for a 5x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new BtLrStrategy().getBlockOrder(GRID_5x1.width, GRID_5x1.height),
        GRID_5x1.width,
        GRID_5x1.height,
      );
    });

    it('covers every block exactly once for a 1x1 grid', () => {
      expectCoversEveryBlockExactlyOnce(
        new BtLrStrategy().getBlockOrder(GRID_1x1.width, GRID_1x1.height),
        GRID_1x1.width,
        GRID_1x1.height,
      );
    });

    it('returns a sequence of length gridWidth x gridHeight', () => {
      const result = new BtLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(result).toHaveLength(GRID_3x3.width * GRID_3x3.height);
    });

    it('returns no coordinate outside the grid bounds', () => {
      const result = new BtLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(
        result.every(
          ({ x, y }) =>
            x >= 0 && x < GRID_3x3.width && y >= 0 && y < GRID_3x3.height,
        ),
      ).toBe(true);
    });

    it('returns no duplicate coordinates', () => {
      const result = new BtLrStrategy().getBlockOrder(
        GRID_3x3.width,
        GRID_3x3.height,
      );
      expect(new Set(result.map(({ x, y }) => `${x},${y}`)).size).toBe(
        result.length,
      );
    });

    it('satisfies the common invariants with alternate active', () => {
      expectCoversEveryBlockExactlyOnce(
        new BtLrStrategy(true).getBlockOrder(GRID_3x3.width, GRID_3x3.height),
        GRID_3x3.width,
        GRID_3x3.height,
      );
    });
  });
});
```

- [ ] **Step 6: Delete the shared-loop invariants spec**

```bash
git rm backend/src/reading-order/reading-order-invariants.spec.ts
```

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS. Each strategy spec file now has 13 tests (5 original + 8 new invariants) = 52 across the four files, replacing the 40 tests removed with the deleted shared-loop file - net change accounted for by the four `1x1`-grid cases and the four `satisfies the common invariants with alternate active` cases that didn't exist before, plus per-strategy length/bounds/duplicate checks that were previously only asserted once globally. No suite outside `reading-order/` is affected.

- [ ] **Step 8: Commit**

```bash
git add backend/src/reading-order/__fixtures__/reading-order.fixtures.ts backend/src/reading-order/strategies/lr-tb.strategy.spec.ts backend/src/reading-order/strategies/rl-tb.strategy.spec.ts backend/src/reading-order/strategies/tb-lr.strategy.spec.ts backend/src/reading-order/strategies/bt-lr.strategy.spec.ts
git rm backend/src/reading-order/reading-order-invariants.spec.ts
git commit -m "$(cat <<'EOF'
test(reading-order): align tests with docs/tests/reading-order.md contract

Modified files:
- backend/src/reading-order/__fixtures__/reading-order.fixtures.ts - shared grid sizes, expected 3x3 sequences, and a coverage-assertion helper, per the doc's Fixtures section
- backend/src/reading-order/strategies/lr-tb.strategy.spec.ts, rl-tb.strategy.spec.ts, tb-lr.strategy.spec.ts, bt-lr.strategy.spec.ts - use shared fixtures, add per-strategy invariant tests (3x3, 1x5, 5x1, 1x1 coverage, length, bounds, duplicates, alternate) with no shared test loop
- backend/src/reading-order/reading-order-invariants.spec.ts - removed, its parameterised-loop pattern is forbidden by docs/tests/index.md; coverage now lives per-strategy
EOF
)"
```

---

### Task 5: Module-wiring test and documentation fixes

**Files:**
- Create: `backend/src/reading-order/reading-order.module.spec.ts`
- Modify: `backend/src/reading-order/reading-order-strategy.interface.ts`
- Modify: `backend/src/reading-order/reading-order.registry.ts`
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: `ReadingOrderModule`, `ReadingOrderRegistry` (both already built, unchanged in behaviour - only JSDoc text changes).

- [ ] **Step 1: Add the module-wiring test**

`reading-order.module.ts` currently has 0% test coverage: every existing test constructs `new ReadingOrderRegistry()` directly instead of resolving it through Nest's DI container, so a typo or omission in the module's `providers`/`exports` arrays would go undetected until a consumer (FEAT-006) fails to boot. Precedent for this pattern: `backend/src/alphabet/hexahue-alphabet.service.spec.ts` uses `Test.createTestingModule`.

```typescript
// backend/src/reading-order/reading-order.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ReadingOrderModule } from './reading-order.module';
import { ReadingOrderRegistry } from './reading-order.registry';

describe('ReadingOrderModule', () => {
  it('exposes ReadingOrderRegistry to importing modules', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ReadingOrderModule],
    }).compile();

    expect(moduleRef.get(ReadingOrderRegistry)).toBeInstanceOf(
      ReadingOrderRegistry,
    );
  });
});
```

- [ ] **Step 2: Run the new test to verify it passes**

Run: `cd backend && npx jest reading-order/reading-order.module.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 3: Fix the misleading padding JSDoc**

In `backend/src/reading-order/reading-order-strategy.interface.ts`, replace:

```typescript
/**
 * Produces the traversal order of pivot blocks across a block grid.
 *
 * Implementations cover every block in the grid exactly once. Padding
 * blocks (added during grid construction) always occupy the trailing
 * positions of whichever block ends up last in the returned sequence -
 * there is no separate padding concept at this layer.
 */
export interface ReadingOrderStrategy {
  /** The reading order this strategy implements. */
  readonly id: ReadingOrder;

  /**
   * Returns every block coordinate in this strategy's traversal order.
   *
   * @param widthInBlocks - Grid width, in pivot blocks (not cases).
   * @param heightInBlocks - Grid height, in pivot blocks (not cases).
   */
  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[];
}
```

with:

```typescript
/**
 * Produces the traversal order of pivot blocks across a block grid.
 *
 * Implementations cover every block in the grid exactly once. The
 * returned sequence is the complete linear traversal order - grid
 * construction fills it with message content from the start, and
 * whatever positions remain at the tail become padding (which can span
 * several trailing blocks, not just the last one). Padding placement
 * itself is not modelled at this layer.
 */
export interface ReadingOrderStrategy {
  /** The reading order this strategy implements. */
  readonly id: ReadingOrder;

  /**
   * Returns every block coordinate in this strategy's traversal order.
   *
   * @param widthInBlocks - Grid width, in pivot blocks (not cases). Must be a positive integer.
   * @param heightInBlocks - Grid height, in pivot blocks (not cases). Must be a positive integer.
   */
  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[];
}
```

- [ ] **Step 4: Fix the stale ownership wording in the registry JSDoc**

In `backend/src/reading-order/reading-order.registry.ts`, replace:

```typescript
/**
 * Resolves a key-codec ReadingOrder value to its concrete
 * ReadingOrderStrategy implementation.
 */
```

with:

```typescript
/**
 * Resolves a ReadingOrder value to its concrete ReadingOrderStrategy
 * implementation.
 */
```

- [ ] **Step 5: Add FEAT-005 to TEST-001's dependencies in BACKLOG.md**

`TEST-001` (backend unit test suite consolidation) is meant to be the pass that reconciles every algorithmic module's tests against its `docs/tests/*.md` spec, but its `depends-on` list omits FEAT-005, so nothing would have caught this drift automatically. Find:

```
- **depends-on:** FEAT-002, FEAT-004, FEAT-006, FEAT-007, FEAT-008
```

(under `### [TEST-001]`) and replace with:

```
- **depends-on:** FEAT-002, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-008
```

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including the new module spec, no regressions.

- [ ] **Step 7: Commit**

```bash
git add backend/src/reading-order/reading-order.module.spec.ts backend/src/reading-order/reading-order-strategy.interface.ts backend/src/reading-order/reading-order.registry.ts BACKLOG.md
git commit -m "$(cat <<'EOF'
test(reading-order): add module-wiring test, fix stale JSDoc, update TEST-001 deps

Modified files:
- backend/src/reading-order/reading-order.module.spec.ts - new test resolving ReadingOrderRegistry through Nest DI, closing the module's 0% coverage gap
- backend/src/reading-order/reading-order-strategy.interface.ts - correct the padding JSDoc (padding can span multiple trailing blocks, not just the last one), document the positive-integer precondition on getBlockOrder
- backend/src/reading-order/reading-order.registry.ts - drop stale "key-codec" ownership wording, reading-order now owns ReadingOrder
- BACKLOG.md - add FEAT-005 to TEST-001's depends-on so the consolidation pass covers reading-order too
EOF
)"
```

---

## After this plan

Update `BACKLOG.md` (`FEAT-005` status `ready` -> `done` - already committed in Task 3's follow-up), push `feat/FEAT-005-reading-order-strategies`, and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-006** (grid construction - symbol layout and random padding), which will consume `ReadingOrderRegistry` to lay out symbols and padding along a chosen reading order. Before writing that plan, read `docs/tests/cipher.md` first (FEAT-006's spec document, per `docs/tests/index.md`'s Backlog Correspondence table) - this is now a standing step, not optional.
