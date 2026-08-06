import { BlockCoordinate } from '../reading-order-strategy.interface';

/** Grid dimensions shared across reading-order test suites. */
export const GRID_3x3 = { width: 3, height: 3 };
export const GRID_1x5 = { width: 1, height: 5 };
export const GRID_5x1 = { width: 5, height: 1 };
export const GRID_1x1 = { width: 1, height: 1 };

export const EXPECTED_LR_TB_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
];

export const EXPECTED_LR_TB_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
];

export const EXPECTED_RL_TB_3x3: BlockCoordinate[] = [
  { x: 2, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: 2, y: 2 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
];

export const EXPECTED_RL_TB_ALT_3x3: BlockCoordinate[] = [
  { x: 2, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
];

export const EXPECTED_TB_LR_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
];

export const EXPECTED_TB_LR_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
];

export const EXPECTED_BT_LR_3x3: BlockCoordinate[] = [
  { x: 0, y: 2 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  { x: 1, y: 2 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 2, y: 2 },
  { x: 2, y: 1 },
  { x: 2, y: 0 },
];

export const EXPECTED_BT_LR_ALT_3x3: BlockCoordinate[] = [
  { x: 0, y: 2 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 1 },
  { x: 2, y: 0 },
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
