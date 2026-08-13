import { VisualAlphabet, ColorGrid } from '../../shared/types';

/** Pivot block sizes coprime with MockAlphabet's dimensions (3x2). */
export const VALID_PIVOT_SIZES = [5, 7, 11];

/** Pivot block sizes that share a factor with MockAlphabet's dimensions (3x2). */
export const WEAK_PIVOT_SIZES_MOCK = [2, 3, 6];

/** Sample messages using MockAlphabet's character set (A-F). */
export const SAMPLE_MESSAGES = {
  allSupportedChars: 'ABCDEF',
  empty: '',
  singleChar: 'A',
  withUnsupportedChars: 'ABXYZ',
};

/** The six colour values used across MockAlphabet's symbols. */
export const MOCK_ALPHABET_PALETTE = [
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'cyan',
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

/**
 * Asserts that every message-symbol region (row-major: left to right, then
 * top to bottom) matches the alphabet's rendering of the corresponding
 * character, and every other case in the grid is filled with a colour from
 * the given palette.
 *
 * Deliberately checks case by case rather than assuming the grid height is
 * an exact multiple of symbolHeight: buildGrid rounds height up to a
 * multiple of pivotBlockSize, which can leave a trailing partial row of
 * cases that doesn't correspond to any whole symbol-height slot. A
 * slot-based sweep across the full grid height would read past the last
 * real row in that situation. Loops here are fine - this is test-support
 * code, not the body of an `it` block.
 */
export function expectPaddingOnlyAfterMessage(
  grid: ColorGrid,
  message: string,
  alphabet: VisualAlphabet,
  palette: string[],
): void {
  const symbolsPerRow = grid[0].length / alphabet.symbolWidth;
  const paletteSet = new Set(palette);
  const occupied = new Set<string>();

  for (let i = 0; i < message.length; i++) {
    const row = Math.floor(i / symbolsPerRow);
    const col = i % symbolsPerRow;
    const baseX = col * alphabet.symbolWidth;
    const baseY = row * alphabet.symbolHeight;
    const region = extractRegion(
      grid,
      baseX,
      baseY,
      alphabet.symbolWidth,
      alphabet.symbolHeight,
    );
    expect(region).toEqual(alphabet.getBlock(message[i]));

    for (let dy = 0; dy < alphabet.symbolHeight; dy++) {
      for (let dx = 0; dx < alphabet.symbolWidth; dx++) {
        occupied.add(`${baseX + dx},${baseY + dy}`);
      }
    }
  }

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (!occupied.has(`${x},${y}`)) {
        expect(paletteSet.has(grid[y][x])).toBe(true);
      }
    }
  }
}
