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

- [ ] **Step 1: Write the failing tests**

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

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/strategies/lr-tb.strategy.spec.ts reading-order/strategies/rl-tb.strategy.spec.ts`
Expected: FAIL - `Cannot find module './lr-tb.strategy'` / `'./rl-tb.strategy'`

- [ ] **Step 3: Create the interface file**

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

- [ ] **Step 4: Implement LrTbStrategy and RlTbStrategy**

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

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/strategies/lr-tb.strategy.spec.ts reading-order/strategies/rl-tb.strategy.spec.ts`
Expected: PASS (12 tests: 6 per file)

- [ ] **Step 6: Relocate `ReadingOrder` into `key-codec.ts` as an import + re-export**

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

- [ ] **Step 7: Run the full backend suite to confirm no regression**

Run: `cd backend && npm run test`
Expected: PASS, all suites including the unmodified `key-codec.spec.ts` (24 tests) plus the 2 new spec files.

- [ ] **Step 8: Commit**

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

- [ ] **Step 1: Write the failing tests**

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

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/strategies/tb-lr.strategy.spec.ts reading-order/strategies/bt-lr.strategy.spec.ts`
Expected: FAIL - `Cannot find module './tb-lr.strategy'` / `'./bt-lr.strategy'`

- [ ] **Step 3: Implement TbLrStrategy and BtLrStrategy**

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/strategies/tb-lr.strategy.spec.ts reading-order/strategies/bt-lr.strategy.spec.ts`
Expected: PASS (12 tests: 6 per file)

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites including Task 1's files, no regressions.

- [ ] **Step 6: Commit**

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

- [ ] **Step 1: Write the failing tests**

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

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest reading-order/reading-order.registry.spec.ts reading-order/reading-order-invariants.spec.ts`
Expected: FAIL - `Cannot find module './reading-order.registry'`

- [ ] **Step 3: Implement ReadingOrderRegistry**

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest reading-order/reading-order.registry.spec.ts reading-order/reading-order-invariants.spec.ts`
Expected: PASS (8 tests in registry.spec.ts + 40 tests in invariants.spec.ts, 8 orders x 5 grid sizes)

- [ ] **Step 5: Wire the registry into the NestJS module**

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

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && npm run test`
Expected: PASS, all suites (Tasks 1, 2, 3 combined) plus every pre-existing suite, no regressions.

- [ ] **Step 7: Commit**

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

## After this plan

Update `BACKLOG.md` (`FEAT-005` status `ready` -> `done`) in the same PR, push `feat/FEAT-005-reading-order-strategies`, and hand back title/description for the user to open the PR. Next up per the validated roadmap: **FEAT-006** (grid construction - symbol layout and random padding), which will consume `ReadingOrderRegistry` to lay out symbols and padding along a chosen reading order.
