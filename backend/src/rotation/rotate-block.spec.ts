// backend/src/rotation/rotate-block.spec.ts
import { rotateBlock } from './rotate-block';
import {
  KNOWN_2x2_BLOCK,
  KNOWN_3x3_BLOCK,
  KNOWN_5x5_BLOCK,
} from './__fixtures__/rotation.fixtures';

describe('rotateBlock', () => {
  describe('0 degree rotation', () => {
    it('returns a grid identical to the input for 0 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 0, 'cw')).toEqual(
        KNOWN_2x2_BLOCK.grid,
      );
    });

    it('returns a grid identical to the input for 0 degrees counter-clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 0, 'ccw')).toEqual(
        KNOWN_2x2_BLOCK.grid,
      );
    });
  });

  describe('90 degree rotation', () => {
    it('places the top-left cell at the top-right position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[0][1]).toBe(KNOWN_2x2_BLOCK.grid[0][0]);
    });

    it('places the top-right cell at the bottom-right position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[1][1]).toBe(KNOWN_2x2_BLOCK.grid[0][1]);
    });

    it('places the bottom-right cell at the bottom-left position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[1][0]).toBe(KNOWN_2x2_BLOCK.grid[1][1]);
    });

    it('places the bottom-left cell at the top-left position for 90 degrees clockwise', () => {
      const result = rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw');
      expect(result[0][0]).toBe(KNOWN_2x2_BLOCK.grid[1][0]);
    });

    it('produces the correct full output for a 2x2 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_2x2_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_2x2_BLOCK.cw90,
      );
    });

    it('produces the correct full output for a 3x3 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_3x3_BLOCK.cw90,
      );
    });

    it('produces the correct full output for a 5x5 block at 90 degrees clockwise', () => {
      expect(rotateBlock(KNOWN_5x5_BLOCK.grid, 90, 'cw')).toEqual(
        KNOWN_5x5_BLOCK.cw90,
      );
    });

    it('produces the mirror result for 90 degrees counter-clockwise vs 90 degrees clockwise', () => {
      const cw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      const ccw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw');
      expect(ccw).toEqual(KNOWN_3x3_BLOCK.ccw90);
      expect(cw).not.toEqual(ccw);
    });
  });

  describe('180 degree rotation', () => {
    it('produces the correct full output for a known block at 180 degrees (direction-agnostic)', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw')).toEqual(
        KNOWN_3x3_BLOCK.rotate180,
      );
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'ccw')).toEqual(
        KNOWN_3x3_BLOCK.rotate180,
      );
    });

    it('is equivalent to two successive 90 degree clockwise rotations', () => {
      const twice = rotateBlock(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw'),
        90,
        'cw',
      );
      expect(twice).toEqual(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw'));
    });
  });

  describe('270 degree rotation', () => {
    it('is equivalent to three successive 90 degree clockwise rotations', () => {
      const thrice = rotateBlock(
        rotateBlock(rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw'), 90, 'cw'),
        90,
        'cw',
      );
      expect(thrice).toEqual(rotateBlock(KNOWN_3x3_BLOCK.grid, 270, 'cw'));
    });

    it('is equivalent to one 90 degree counter-clockwise rotation', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 270, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw'),
      );
    });
  });

  describe('immutability', () => {
    it('does not mutate the input block', () => {
      const original = KNOWN_3x3_BLOCK.grid.map((row) => [...row]);
      rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      expect(KNOWN_3x3_BLOCK.grid).toEqual(original);
    });

    it('returns a new grid object', () => {
      const result = rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'cw');
      expect(result).not.toBe(KNOWN_3x3_BLOCK.grid);
    });
  });

  describe('rotateBlock - direction symmetry', () => {
    it('produces different results for CW vs CCW at 90 degrees for a non-uniform block', () => {
      const cw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'cw');
      const ccw = rotateBlock(KNOWN_3x3_BLOCK.grid, 90, 'ccw');
      expect(cw).not.toEqual(ccw);
    });

    it('produces the same result for CW vs CCW at 0 degrees', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 0, 'ccw'),
      );
    });

    it('produces the same result for CW vs CCW at 180 degrees', () => {
      expect(rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'cw')).toEqual(
        rotateBlock(KNOWN_3x3_BLOCK.grid, 180, 'ccw'),
      );
    });
  });
});
