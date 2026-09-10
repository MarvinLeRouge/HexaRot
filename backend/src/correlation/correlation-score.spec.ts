import { computeCorrelationScore } from './correlation-score';
import { ColorGrid } from '../shared/types';

describe('computeCorrelationScore', () => {
  it('returns 1 for identical pre/post grids (no rotation happened)', () => {
    const grid: ColorGrid = [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ];

    const score = computeCorrelationScore(grid, grid);

    expect(score).toBeCloseTo(1, 10);
  });

  it('computes the exact kappa-based score for a fixed, hand-verified 2x2 grid', () => {
    // preGrid colour counts: red=2, green=1, blue=1 (total 4)
    // p_e = (2/4)^2 + (1/4)^2 + (1/4)^2 = 0.25 + 0.0625 + 0.0625 = 0.375
    // every cell disagrees between pre and post, so p_o = 0
    // kappa = (0 - 0.375) / (1 - 0.375) = -0.6, score = abs(-0.6) = 0.6
    const preGrid: ColorGrid = [
      ['red', 'green'],
      ['blue', 'red'],
    ];
    const postGrid: ColorGrid = [
      ['green', 'red'],
      ['red', 'blue'],
    ];

    const score = computeCorrelationScore(preGrid, postGrid);

    expect(score).toBeCloseTo(0.6, 10);
  });

  it('returns a low score when every cell disagrees across six equally-distributed colours', () => {
    // preGrid: 6 distinct colours, one cell each (total 6), so p_e = 6 * (1/6)^2 = 1/6
    // postGrid is preGrid cyclically shifted by one position, so every cell disagrees: p_o = 0
    // kappa = (0 - 1/6) / (1 - 1/6) = -0.2, score = abs(-0.2) = 0.2
    const preGrid: ColorGrid = [
      ['red', 'green', 'blue', 'yellow', 'purple', 'cyan'],
    ];
    const postGrid: ColorGrid = [
      ['cyan', 'red', 'green', 'blue', 'yellow', 'purple'],
    ];

    const score = computeCorrelationScore(preGrid, postGrid);

    expect(score).toBeCloseTo(0.2, 10);
  });

  it('returns 1 for a single-colour grid (no residual structure to detect)', () => {
    const grid: ColorGrid = [
      ['red', 'red'],
      ['red', 'red'],
    ];

    const score = computeCorrelationScore(grid, grid);

    expect(score).toBeCloseTo(1, 10);
  });
});
