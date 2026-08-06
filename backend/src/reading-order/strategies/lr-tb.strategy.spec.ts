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
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new LrTbStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
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
