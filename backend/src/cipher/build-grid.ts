import { VisualAlphabet, ColorGrid } from '../shared/types';
import { gcd } from '../validation/validate-params';

/**
 * Builds the colour-case grid for a pre-processed message: lays symbols out
 * row by row (left to right, top to bottom), then fills every remaining
 * case with random padding drawn from the alphabet's own colour palette.
 *
 * Grid width is chosen adaptively to keep the grid roughly square rather
 * than growing arbitrarily tall for long messages: the width is the
 * multiple of lcm(pivotBlockSize, symbolWidth) (the base unit satisfying
 * both the block-alignment and symbol-alignment constraints) closest to
 * sqrt(messageLength * symbolWidth * symbolHeight) - the width a perfectly
 * square layout of the message would need. Short messages naturally land
 * on a multiplier of 1 (a single base unit wide); only long messages widen
 * further.
 *
 * Symbol layout here is always this row-major raster, independent of
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
  if (!Number.isInteger(pivotBlockSize) || pivotBlockSize < 1) {
    throw new RangeError(
      `pivotBlockSize must be a positive integer, got ${pivotBlockSize}`,
    );
  }

  const { symbolWidth, symbolHeight } = alphabet;

  const baseWidthUnit = lcm(pivotBlockSize, symbolWidth);
  const baseSymbolsPerRow = baseWidthUnit / symbolWidth;

  const idealWidthInCases = Math.sqrt(
    processedString.length * symbolWidth * symbolHeight,
  );
  const widthMultiplier = Math.max(
    1,
    Math.round(idealWidthInCases / baseWidthUnit),
  );

  const gridWidthInCases = widthMultiplier * baseWidthUnit;
  const symbolsPerRow = widthMultiplier * baseSymbolsPerRow;

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
