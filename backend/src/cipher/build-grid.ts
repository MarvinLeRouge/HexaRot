import { VisualAlphabet, ColorGrid } from '../shared/types';
import { gcd } from '../validation/validate-params';

/**
 * Builds the colour-case grid for a pre-processed message: lays symbols out
 * row by row (left to right, top to bottom) at a fixed width aligned to
 * both the pivot block size and the alphabet's symbol width, then fills
 * every remaining case with random padding drawn from the alphabet's own
 * colour palette.
 *
 * Symbol layout here is always this fixed row-major raster, independent of
 * the key's reading order - reading order governs which pivot block gets
 * which rotation later, not how symbols are initially placed.
 *
 * @param processedString - Message text already filtered to the alphabet's
 *   supported characters (see preprocess()). Every character must be
 *   resolvable via alphabet.getBlock.
 * @param alphabet - Supplies symbol dimensions and per-character colour grids.
 * @param pivotBlockSize - T: both grid dimensions, in cases, are multiples of this.
 */
export function buildGrid(
  processedString: string,
  alphabet: VisualAlphabet,
  pivotBlockSize: number,
): ColorGrid {
  const { symbolWidth, symbolHeight } = alphabet;

  const gridWidthInCases = lcm(pivotBlockSize, symbolWidth);
  const symbolsPerRow = gridWidthInCases / symbolWidth;

  const numRows = Math.ceil(processedString.length / symbolsPerRow);
  const neededHeightInCases = Math.max(symbolHeight, numRows * symbolHeight);
  const gridHeightInCases =
    Math.ceil(neededHeightInCases / pivotBlockSize) * pivotBlockSize;

  const grid: ColorGrid = Array.from({ length: gridHeightInCases }, () =>
    new Array<string>(gridWidthInCases).fill(''),
  );

  for (let i = 0; i < processedString.length; i++) {
    const symbolGrid = alphabet.getBlock(processedString[i]);
    const row = Math.floor(i / symbolsPerRow);
    const col = i % symbolsPerRow;
    const baseY = row * symbolHeight;
    const baseX = col * symbolWidth;

    for (let dy = 0; dy < symbolHeight; dy++) {
      for (let dx = 0; dx < symbolWidth; dx++) {
        grid[baseY + dy][baseX + dx] = symbolGrid[dy][dx];
      }
    }
  }

  const palette = getPalette(alphabet);
  for (let y = 0; y < gridHeightInCases; y++) {
    for (let x = 0; x < gridWidthInCases; x++) {
      if (grid[y][x] === '') {
        grid[y][x] = palette[Math.floor(Math.random() * palette.length)];
      }
    }
  }

  return grid;
}

/** Smallest width, in cases, that is a multiple of both the block size and the symbol width. */
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** Every distinct colour value used across the alphabet's supported characters. */
function getPalette(alphabet: VisualAlphabet): string[] {
  const colors = new Set<string>();
  for (const char of alphabet.getSupportedChars()) {
    for (const row of alphabet.getBlock(char)) {
      for (const color of row) {
        colors.add(color);
      }
    }
  }
  return Array.from(colors);
}
