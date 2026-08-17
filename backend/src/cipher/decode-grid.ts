import { VisualAlphabet, ColorGrid } from '../shared/types';

/** Placeholder for a symbol block that matches no known character. */
export const UNRECOGNIZED_PLACEHOLDER = '?';

/** Builds a reverse lookup: stringified colour-grid block -> character. */
function buildReverseLookup(alphabet: VisualAlphabet): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const char of alphabet.getSupportedChars()) {
    const block = alphabet.getBlock(char);
    lookup.set(JSON.stringify(block), char);
  }
  return lookup;
}

/**
 * Decodes a ColorGrid back into text, reading symbol blocks in the same
 * row-major order buildGrid used to place them. Every block is decoded
 * unconditionally - there is no attempt to determine where the real
 * message ends and random padding begins (see
 * docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md,
 * "Decision 2"). A block that matches no known character becomes
 * UNRECOGNIZED_PLACEHOLDER.
 */
export function decodeGrid(grid: ColorGrid, alphabet: VisualAlphabet): string {
  const { symbolWidth, symbolHeight } = alphabet;
  const gridHeightInCases = grid.length;
  const gridWidthInCases = gridHeightInCases > 0 ? grid[0].length : 0;

  const symbolsPerRow = Math.floor(gridWidthInCases / symbolWidth);
  const symbolRows = Math.floor(gridHeightInCases / symbolHeight);

  const reverseLookup = buildReverseLookup(alphabet);
  let result = '';

  for (let row = 0; row < symbolRows; row++) {
    for (let col = 0; col < symbolsPerRow; col++) {
      const baseY = row * symbolHeight;
      const baseX = col * symbolWidth;
      const block: ColorGrid = [];
      for (let dy = 0; dy < symbolHeight; dy++) {
        block.push(grid[baseY + dy].slice(baseX, baseX + symbolWidth));
      }
      result +=
        reverseLookup.get(JSON.stringify(block)) ?? UNRECOGNIZED_PLACEHOLDER;
    }
  }

  return result;
}
