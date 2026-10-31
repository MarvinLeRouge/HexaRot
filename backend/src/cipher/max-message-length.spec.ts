import { buildGrid } from './build-grid';
import { MAX_ENCODE_MESSAGE_LENGTH } from './max-message-length';
import { VisualAlphabet } from '../shared/types';
import { MAX_IMAGE_PIXELS } from '../renderer/image-limits';

const LARGE_CASE_PIXELS = 32;

/** Hexahue-shaped (2 wide x 3 tall) single-symbol alphabet: only the grid size matters here. */
const HEXAHUE_SHAPED: VisualAlphabet = {
  symbolWidth: 2,
  symbolHeight: 3,
  getBlock: () => [
    ['red', 'red'],
    ['red', 'red'],
    ['red', 'red'],
  ],
  getSupportedChars: () => ['A'],
  isSupported: (char: string) => char === 'A',
} as unknown as VisualAlphabet;

describe('MAX_ENCODE_MESSAGE_LENGTH', () => {
  // 255, 245 and 212 pad the grid the most at this length (checked across all
  // 255 pivot sizes when the limit was chosen); 5 is the default.
  it.each([5, 212, 245, 255])(
    'keeps a maximum-length message within the image pixel limit at size large, pivot %i',
    (pivotBlockSize) => {
      const grid = buildGrid(
        'A'.repeat(MAX_ENCODE_MESSAGE_LENGTH),
        HEXAHUE_SHAPED,
        pivotBlockSize,
      );

      const pixels =
        grid.length * grid[0].length * LARGE_CASE_PIXELS * LARGE_CASE_PIXELS;
      expect(pixels).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
    },
  );
});
