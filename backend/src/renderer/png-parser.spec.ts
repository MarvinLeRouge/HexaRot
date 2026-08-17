import { PngRenderer } from './png-renderer';
import { parsePng } from './png-parser';
import {
  MOCK_ROTATED_GRID_4x6,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

describe('parsePng', () => {
  const renderer = new PngRenderer();

  it.each(['small', 'medium', 'large'] as const)(
    'recovers the original grid from a rendered PNG at size %s',
    async (size) => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, size);
      const casePixels = EXPECTED_PNG_DIMENSIONS[size].casePixels;
      const grid = await parsePng(buffer, casePixels);
      expect(grid).toEqual(MOCK_ROTATED_GRID_4x6);
    },
  );

  it('throws a RangeError for a buffer that is not a valid PNG', async () => {
    const garbage = Buffer.from('not a png image', 'utf-8');
    await expect(parsePng(garbage, 8)).rejects.toThrow(RangeError);
  });

  it('throws a RangeError when image dimensions are not exact multiples of casePixels', async () => {
    const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    await expect(parsePng(buffer, 7)).rejects.toThrow(RangeError);
  });
});
