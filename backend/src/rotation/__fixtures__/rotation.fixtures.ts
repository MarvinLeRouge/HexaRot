// backend/src/rotation/__fixtures__/rotation.fixtures.ts
import { ColorGrid } from '../../shared/types';
import { RotationSequence } from '../../key/key-codec';

// Note: 270-degree outputs are deliberately not stored here. They are
// proven by composition against the 90-degree primitive in rotate-block.spec.ts
// (three successive 90CW rotations, or one 90CCW rotation), which is a
// stronger check than a hand-typed 270-degree literal would be.

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
export const SAMPLE_FULL_GRID: ColorGrid = Array.from(
  { length: 10 },
  (_, row) => Array.from({ length: 10 }, (_, col) => `${row}-${col}`),
);

/**
 * A representative subset of rotation sequences. Entries are angle
 * indices (0=0deg, 1=90deg, 2=180deg, 3=270deg), not degrees.
 *
 * Not imported by name anywhere: docs/tests/rotation.md's Fixtures section
 * requires defining this set, but every RotationEngine test needs one
 * specific sequence matching a specific spec bullet's stated values, not an
 * arbitrary member of a representative subset. Kept here to satisfy the
 * spec's literal Fixtures list.
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
