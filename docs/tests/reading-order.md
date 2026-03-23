# HexaRot — Test Spec: Reading Order Domain

Covers: FEAT-005 (ReadingOrderStrategy — LR-TB, RL-TB, TB-LR, BT-LR, alternate modifier).

All tests in this document are **unit tests**. No database access, no filesystem.
Each strategy is a pure function: given grid dimensions (in blocks), it returns an
ordered sequence of `{x, y}` coordinates.

---

## 1. Common invariants (all strategies)

These invariants apply to every strategy and every variant (base + alternate).
They are tested for each strategy individually — do not rely on a shared loop in tests.

```
describe('<StrategyName> — invariants')
```

- it covers every block exactly once for a 3×3 grid
- it covers every block exactly once for a 1×5 grid
- it covers every block exactly once for a 5×1 grid
- it covers every block exactly once for a 1×1 grid
- it returns a sequence of length `gridWidth × gridHeight`
- it returns no coordinate outside the grid bounds
- it returns no duplicate coordinates

---

## 2. LR-TB (left-right, top-bottom)

```
describe('LrTbStrategy')
```

- it starts at (0, 0)
- it traverses row 0 left to right before moving to row 1
- it ends at (gridWidth-1, gridHeight-1) for a 3×3 grid
- it produces [(0,0),(1,0),(2,0),(0,1),(1,1),(2,1),(0,2),(1,2),(2,2)] for a 3×3 grid

**Alternate modifier**
- it reverses direction on row 1: row 0 goes L→R, row 1 goes R→L
- it reverses again on row 2: row 2 goes L→R
- it produces [(0,0),(1,0),(2,0),(2,1),(1,1),(0,1),(0,2),(1,2),(2,2)] for a 3×3 grid
- it satisfies the common invariants with alternate active

---

## 3. RL-TB (right-left, top-bottom)

```
describe('RlTbStrategy')
```

- it starts at (gridWidth-1, 0)
- it traverses row 0 right to left before moving to row 1
- it ends at (0, gridHeight-1) for a 3×3 grid
- it produces [(2,0),(1,0),(0,0),(2,1),(1,1),(0,1),(2,2),(1,2),(0,2)] for a 3×3 grid

**Alternate modifier**
- it reverses direction on row 1: row 0 goes R→L, row 1 goes L→R
- it satisfies the common invariants with alternate active

---

## 4. TB-LR (top-bottom, left-right)

```
describe('TbLrStrategy')
```

- it starts at (0, 0)
- it traverses column 0 top to bottom before moving to column 1
- it ends at (gridWidth-1, gridHeight-1) for a 3×3 grid
- it produces [(0,0),(0,1),(0,2),(1,0),(1,1),(1,2),(2,0),(2,1),(2,2)] for a 3×3 grid

**Alternate modifier**
- it reverses direction on column 1: column 0 goes T→B, column 1 goes B→T
- it satisfies the common invariants with alternate active

---

## 5. BT-LR (bottom-top, left-right)

```
describe('BtLrStrategy')
```

- it starts at (0, gridHeight-1)
- it traverses column 0 bottom to top before moving to column 1
- it ends at (gridWidth-1, 0) for a 3×3 grid
- it produces [(0,2),(0,1),(0,0),(1,2),(1,1),(1,0),(2,2),(2,1),(2,0)] for a 3×3 grid

**Alternate modifier**
- it reverses direction on column 1: column 0 goes B→T, column 1 goes T→B
- it satisfies the common invariants with alternate active

---

## 6. Padding placement

Padding blocks are always placed at the **end of the traversal sequence**, regardless
of strategy. This is tested via the grid construction layer (see cipher.md), but the
reading order strategy must expose a stable "end" position that grid construction
can rely on.

- it returns the last position in the sequence as the start of the padding zone
  for LR-TB on a 3×3 grid (no padding in a perfectly sized grid, but the end
  position must be deterministic)

---

## Fixtures

The following shared fixtures must be defined in `__fixtures__/reading-order.fixtures.ts`:

- `GRID_3x3` — `{ width: 3, height: 3 }`
- `GRID_1x5` — `{ width: 1, height: 5 }`
- `GRID_5x1` — `{ width: 5, height: 1 }`
- `GRID_1x1` — `{ width: 1, height: 1 }`
- `EXPECTED_LR_TB_3x3` — hardcoded expected sequence for LR-TB on a 3×3 grid
- `EXPECTED_LR_TB_ALT_3x3` — hardcoded expected sequence for LR-TB alternate on a 3×3 grid
- (and equivalents for the other three strategies)
