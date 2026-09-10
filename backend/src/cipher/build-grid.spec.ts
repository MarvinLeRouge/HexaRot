import { buildGrid } from './build-grid';
import { VisualAlphabet } from '../shared/types';
import { MockAlphabet } from '../../test/utils/mock-alphabet';
import {
  VALID_PIVOT_SIZES,
  SAMPLE_MESSAGES,
  MOCK_ALPHABET_PALETTE,
  extractRegion,
  expectPaddingOnlyAfterMessage,
} from './__fixtures__/cipher.fixtures';

/** Small local seeded PRNG (mulberry32) for deterministic test-only randomness. */
function mulberry32ForTest(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('buildGrid', () => {
  describe('dimensions', () => {
    it('produces a grid whose width in cases is a multiple of pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 7);
      expect(grid[0].length % 7).toBe(0);
    });

    it('produces a grid whose height in cases is a multiple of pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 7);
      expect(grid.length % 7).toBe(0);
    });

    it('satisfies both dimension constraints for T=5, T=7, T=11', () => {
      const alphabet = new MockAlphabet();
      const results = VALID_PIVOT_SIZES.map((T) => {
        const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, T);
        return grid[0].length % T === 0 && grid.length % T === 0;
      });
      expect(results).toEqual(VALID_PIVOT_SIZES.map(() => true));
    });

    it('produces a structurally correct grid for T=6 (a weak pivot size, sharing a factor with both alphabet dimensions)', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.allSupportedChars;
      const grid = buildGrid(message, alphabet, 6);
      expect(grid[0].length % 6).toBe(0);
      expect(grid.length % 6).toBe(0);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });
  });

  describe('symbol layout', () => {
    it('places the first symbol of the message at position (0,0)', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 5);
      expect(
        extractRegion(grid, 0, 0, alphabet.symbolWidth, alphabet.symbolHeight),
      ).toEqual(alphabet.getBlock('A'));
    });

    it('lays out symbols left-to-right, top-to-bottom within the message area', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.allSupportedChars, alphabet, 5);
      // symbolsPerRow = widthMultiplier(1) * lcm(5,3)/3 = 5, so 'ABCDEF' wraps: row 0 = ABCDE, row 1 = F
      expect(
        extractRegion(
          grid,
          alphabet.symbolWidth,
          0,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        ),
      ).toEqual(alphabet.getBlock('B'));
      expect(
        extractRegion(
          grid,
          0,
          alphabet.symbolHeight,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        ),
      ).toEqual(alphabet.getBlock('F'));
    });

    it('places all N symbols of the message in the grid (no symbol omitted)', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.allSupportedChars;
      const grid = buildGrid(message, alphabet, 5);
      const symbolsPerRow = 5;
      const placed = Array.from(message).map((_char, i) => {
        const row = Math.floor(i / symbolsPerRow);
        const col = i % symbolsPerRow;
        return extractRegion(
          grid,
          col * alphabet.symbolWidth,
          row * alphabet.symbolHeight,
          alphabet.symbolWidth,
          alphabet.symbolHeight,
        );
      });
      expect(placed).toEqual(
        Array.from(message).map((char) => alphabet.getBlock(char)),
      );
    });

    it('places no message symbol in the padding area', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      const paddingRegion = extractRegion(
        grid,
        alphabet.symbolWidth,
        0,
        alphabet.symbolWidth,
        alphabet.symbolHeight,
      );
      expect(paddingRegion).not.toEqual(alphabet.getBlock('A'));
      expect(
        paddingRegion
          .flat()
          .every((color) => MOCK_ALPHABET_PALETTE.includes(color)),
      ).toBe(true);
    });
  });

  describe('padding', () => {
    it("fills trailing positions with valid colour values from the alphabet's palette", () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      const trailingRegion = extractRegion(
        grid,
        alphabet.symbolWidth,
        0,
        grid[0].length - alphabet.symbolWidth,
        alphabet.symbolHeight,
      );
      expect(
        trailingRegion
          .flat()
          .every((color) => MOCK_ALPHABET_PALETTE.includes(color)),
      ).toBe(true);
    });

    it('places padding only after the last message symbol', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.singleChar;
      const grid = buildGrid(message, alphabet, 5);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('uses random padding (two calls with the same input may differ in padding content)', () => {
      const alphabet = new MockAlphabet();
      const message = SAMPLE_MESSAGES.singleChar;
      const gridA = buildGrid(message, alphabet, 7);
      const gridB = buildGrid(message, alphabet, 7);
      expect(gridA).not.toEqual(gridB);
    });

    it('returns a palette-order-independent grid (getPalette output is sorted)', () => {
      // Build twice with alphabets whose getSupportedChars() return the same
      // characters in different orders (simulating different DB row order);
      // since the underlying colour palettes are identical, the returned
      // palette content must match, so its element order must be pinned by
      // sort() alone, not by iteration order.
      const forwardAlphabet = new MockAlphabet();
      const reversedAlphabet: VisualAlphabet = {
        symbolWidth: forwardAlphabet.symbolWidth,
        symbolHeight: forwardAlphabet.symbolHeight,
        getSupportedChars: () =>
          [...forwardAlphabet.getSupportedChars()].reverse(),
        getBlock: (char: string) => forwardAlphabet.getBlock(char),
      };

      const seed = 42;
      const grid1 = buildGrid('A', forwardAlphabet, 3, mulberry32ForTest(seed));
      const grid2 = buildGrid(
        'A',
        reversedAlphabet,
        3,
        mulberry32ForTest(seed),
      );

      expect(grid1).toEqual(grid2);
    });
  });

  describe('edge cases', () => {
    it('handles a message that fills the grid exactly (zero padding needed)', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(25);
      const grid = buildGrid(message, alphabet, 5);
      expect(grid.length).toBe(10);
      expect(grid[0].length).toBe(15);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('handles a single-character message', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 5);
      expect(
        extractRegion(grid, 0, 0, alphabet.symbolWidth, alphabet.symbolHeight),
      ).toEqual(alphabet.getBlock('A'));
      expect(grid.length % 5).toBe(0);
      expect(grid[0].length % 5).toBe(0);
    });

    it('handles an empty string (grid contains only padding)', () => {
      const alphabet = new MockAlphabet();
      const grid = buildGrid(SAMPLE_MESSAGES.empty, alphabet, 5);
      expect(grid.length).toBe(5);
      expect(grid[0].length).toBe(15);
      expect(
        grid.flat().every((color) => MOCK_ALPHABET_PALETTE.includes(color)),
      ).toBe(true);
    });
  });

  describe('input validation', () => {
    it('throws a RangeError for pivotBlockSize=0', () => {
      const alphabet = new MockAlphabet();
      expect(() => buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 0)).toThrow(
        RangeError,
      );
    });

    it('throws a RangeError for a negative pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      expect(() => buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, -3)).toThrow(
        RangeError,
      );
    });

    it('throws a RangeError for a non-integer pivotBlockSize', () => {
      const alphabet = new MockAlphabet();
      expect(() =>
        buildGrid(SAMPLE_MESSAGES.singleChar, alphabet, 2.5),
      ).toThrow(RangeError);
    });
  });

  describe('adaptive width for long messages', () => {
    it('widens the grid for a long message instead of only growing taller', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(90);
      const grid = buildGrid(message, alphabet, 5);
      expect(grid[0].length).toBe(30);
      expect(grid.length).toBe(20);
    });

    it('places symbols and padding correctly once the grid has widened', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(90);
      const grid = buildGrid(message, alphabet, 5);
      expectPaddingOnlyAfterMessage(
        grid,
        message,
        alphabet,
        MOCK_ALPHABET_PALETTE,
      );
    });

    it('keeps the grid roughly square for a very long message instead of growing arbitrarily tall', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(200);
      const grid = buildGrid(message, alphabet, 7);
      expect(grid[0].length).toBe(42);
      expect(grid.length).toBe(35);
    });

    it('still produces a width and height that are both multiples of pivotBlockSize once widened', () => {
      const alphabet = new MockAlphabet();
      const message = 'A'.repeat(200);
      const grid = buildGrid(message, alphabet, 7);
      expect(grid[0].length % 7).toBe(0);
      expect(grid.length % 7).toBe(0);
    });

    it('keeps multiple pivot-block columns for a narrow-symbol alphabet on a long message (the case that motivated this fix)', () => {
      const narrowAlphabet: VisualAlphabet = {
        symbolWidth: 2,
        symbolHeight: 3,
        getBlock: () => [
          ['red', 'green'],
          ['blue', 'yellow'],
          ['purple', 'cyan'],
        ],
        getSupportedChars: () => ['A'],
      };
      const grid = buildGrid('A'.repeat(500), narrowAlphabet, 7);
      const pivotBlockColumns = grid[0].length / 7;
      expect(pivotBlockColumns).toBeGreaterThanOrEqual(4);
    });
  });
});
