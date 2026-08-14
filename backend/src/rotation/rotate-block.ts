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
