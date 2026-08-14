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
    const result = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'cw',
      'LR-TB',
    );
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
    const cwResult = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [1, 1, 1, 1],
      'cw',
      'LR-TB',
    );
    const ccwResult = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [1, 1, 1, 1],
      'ccw',
      'LR-TB',
    );
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
    const result = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 0, 0, 0],
      'cw',
      'LR-TB',
    );
    expect(result).toEqual(SAMPLE_FULL_GRID);
  });

  it('produces a grid of the same dimensions as the input', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const result = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'cw',
      'LR-TB',
    );
    expect(result.length).toBe(SAMPLE_FULL_GRID.length);
    expect(result[0].length).toBe(SAMPLE_FULL_GRID[0].length);
  });
});

describe('RotationEngine.decode', () => {
  it('applies the inverse rotation sequence in reverse block order', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [1, 2, 3, 0],
      'cw',
      'LR-TB',
    );
    const decoded = engine.decode(encoded, 5, [1, 2, 3, 0], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid after encode-decode for a single block', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const singleBlockGrid: ColorGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => `${row}-${col}`),
    );
    const encoded = engine.encode(
      singleBlockGrid,
      5,
      [2, 0, 0, 0],
      'cw',
      'LR-TB',
    );
    const decoded = engine.decode(encoded, 5, [2, 0, 0, 0], 'cw', 'LR-TB');
    expect(decoded).toEqual(singleBlockGrid);
  });

  it('recovers the original grid after encode-decode for a multi-block grid', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'cw',
      'LR-TB',
    );
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'LR-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid for all four rotation angles', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'cw',
      'RL-TB',
    );
    const decoded = engine.decode(encoded, 5, [0, 1, 2, 3], 'cw', 'RL-TB');
    expect(decoded).toEqual(SAMPLE_FULL_GRID);
  });

  it('recovers the original grid for both rotation directions', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encodedCw = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'cw',
      'LR-TB',
    );
    expect(engine.decode(encodedCw, 5, [0, 1, 2, 3], 'cw', 'LR-TB')).toEqual(
      SAMPLE_FULL_GRID,
    );
    const encodedCcw = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [0, 1, 2, 3],
      'ccw',
      'LR-TB',
    );
    expect(engine.decode(encodedCcw, 5, [0, 1, 2, 3], 'ccw', 'LR-TB')).toEqual(
      SAMPLE_FULL_GRID,
    );
  });
});

describe('RotationEngine round-trip (encode then decode)', () => {
  it('recovers the original grid for a 2x2 block grid, sequence [90, 180, 270, 0], CW', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    const encoded = engine.encode(
      SAMPLE_FULL_GRID,
      5,
      [1, 2, 3, 0],
      'cw',
      'TB-LR',
    );
    const decoded = engine.decode(encoded, 5, [1, 2, 3, 0], 'cw', 'TB-LR');
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

describe('RotationEngine input validation', () => {
  it('throws for a pivotBlockSize of 0', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    expect(() =>
      engine.encode(SAMPLE_FULL_GRID, 0, [0, 1, 2, 3], 'cw', 'LR-TB'),
    ).toThrow();
  });

  it('throws for a negative pivotBlockSize', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    expect(() =>
      engine.encode(SAMPLE_FULL_GRID, -5, [0, 1, 2, 3], 'cw', 'LR-TB'),
    ).toThrow();
  });

  it('throws for a non-integer pivotBlockSize', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    expect(() =>
      engine.encode(SAMPLE_FULL_GRID, 2.5, [0, 1, 2, 3], 'cw', 'LR-TB'),
    ).toThrow();
  });

  it('applies the same guard to decode', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    expect(() =>
      engine.decode(SAMPLE_FULL_GRID, 0, [0, 1, 2, 3], 'cw', 'LR-TB'),
    ).toThrow();
  });

  it('throws for a rotation sequence entry outside 0-3', () => {
    const engine = new RotationEngine(new ReadingOrderRegistry());
    expect(() =>
      engine.encode(SAMPLE_FULL_GRID, 5, [4, 0, 0, 0], 'cw', 'LR-TB'),
    ).toThrow();
  });
});
