# HexaRot — Test Spec: Rotation Domain

Covers: FEAT-007 (block rotation engine).

All tests in this document are **unit tests**. No database access, no filesystem.
The rotation engine operates on pure 2D colour grids — no alphabet or key dependency
at test time (those are resolved upstream).

---

## 1. Single block rotation

```
describe('rotateBlock')
```

For all tests in this section, a known T×T block with distinct colour values per cell
is used as input, so that rotation correctness can be verified by cell position.

**0° rotation**
- it returns a grid identical to the input for 0° clockwise
- it returns a grid identical to the input for 0° counter-clockwise

**90° rotation**
- it places the top-left cell at the top-right position for 90° clockwise
- it places the top-right cell at the bottom-right position for 90° clockwise
- it places the bottom-right cell at the bottom-left position for 90° clockwise
- it places the bottom-left cell at the top-left position for 90° clockwise
- it produces the correct full output for a 2×2 block at 90° clockwise
- it produces the correct full output for a 3×3 block at 90° clockwise
- it produces the correct full output for a 5×5 block at 90° clockwise
- it produces the mirror result for 90° counter-clockwise vs 90° clockwise

**180° rotation**
- it produces the correct full output for a known block at 180° (direction-agnostic)
- it is equivalent to two successive 90° clockwise rotations

**270° rotation**
- it is equivalent to three successive 90° clockwise rotations
- it is equivalent to one 90° counter-clockwise rotation

**Immutability**
- it does not mutate the input block
- it returns a new grid object

---

## 2. Full grid rotation engine

```
describe('RotationEngine.encode')
```

- it applies the rotation sequence to blocks in the order defined by the
  ReadingOrderStrategy
- it cycles through the rotation sequence when there are more blocks than
  sequence entries (e.g. 5 blocks, sequence of length 4: rotations applied are
  seq[0], seq[1], seq[2], seq[3], seq[0])
- it applies rotation direction (CW vs CCW) consistently to all blocks
- it leaves a block unchanged when the sequence entry is 0°
- it produces a grid of the same dimensions as the input

```
describe('RotationEngine.decode')
```

- it applies the inverse rotation sequence in reverse block order
- it recovers the original grid after encode→decode for a single block
- it recovers the original grid after encode→decode for a multi-block grid
- it recovers the original grid for all four rotation angles
- it recovers the original grid for both rotation directions

**Round-trip (encode → decode)**
- it recovers the original grid for a 2×2 block grid, sequence [90, 180, 270, 0], CW
- it recovers the original grid for a 3×3 block grid, sequence [180, 0, 90, 270], CCW
- it recovers the original grid for a non-square grid (wider than tall)
- it recovers the original grid for a non-square grid (taller than wide)
- it recovers the original grid when sequence cycling occurs

---

## 3. Rotation direction

```
describe('rotateBlock — direction symmetry')
```

- it produces different results for CW vs CCW at 90° for a non-uniform block
- it produces the same result for CW vs CCW at 0°
- it produces the same result for CW vs CCW at 180°

---

## Fixtures

The following shared fixtures must be defined in `__fixtures__/rotation.fixtures.ts`:

- `KNOWN_2x2_BLOCK` — a 2×2 ColorGrid with four distinct colours, plus the expected
  outputs for each of the four rotation angles (CW and CCW).
- `KNOWN_3x3_BLOCK` — same for a 3×3 grid.
- `KNOWN_5x5_BLOCK` — same for a 5×5 grid.
- `SAMPLE_FULL_GRID` — a small full grid (e.g. 10×6 cases = 2×2 blocks of T=5)
  with known content, used for round-trip tests.
- `ALL_ROTATION_SEQUENCES` — a representative subset of rotation sequences
  (at minimum: all-zeros, all-90, [0,90,180,270], [270,180,90,0]).
