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

  it('starts at (0, 0)', () => {
    const result = new TbLrStrategy().getBlockOrder(
      GRID_3x3.width,
      GRID_3x3.height,
    );
    expect(result[0]).toEqual({ x: 0, y: 0 });
  });

  it('traverses column 0 top to bottom before moving to column 1', () => {
    const result = new TbLrStrategy().getBlockOrder(
      GRID_3x3.width,
      GRID_3x3.height,
    );
    expect(result.slice(0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ]);
  });

  it('ends at (gridWidth-1, gridHeight-1) for a 3x3 grid', () => {
    const result = new TbLrStrategy().getBlockOrder(
      GRID_3x3.width,
      GRID_3x3.height,
    );
    expect(result[result.length - 1]).toEqual({
      x: GRID_3x3.width - 1,
      y: GRID_3x3.height - 1,
    });
  });

  it('reverses direction on column 1: column 0 goes top to bottom, column 1 goes bottom to top', () => {
    const result = new TbLrStrategy(true).getBlockOrder(
      GRID_3x3.width,
      GRID_3x3.height,
    );
    expect(result.slice(0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ]);
    expect(result.slice(3, 6)).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
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
