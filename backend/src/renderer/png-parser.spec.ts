import sharp from 'sharp';
import { MAX_IMAGE_PIXELS } from './image-limits';
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

  it('reads a 16-bit RGBA re-encoding of a cryptogram as the same grid', async () => {
    const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    const sixteenBitRgba = await sharp(buffer)
      .ensureAlpha()
      .toColourspace('rgb16')
      .png()
      .toBuffer();

    expect(await parsePng(sixteenBitRgba, 8)).toEqual(
      await parsePng(buffer, 8),
    );
  });

  it('throws a RangeError for a PNG over the image pixel budget', async () => {
    const side = Math.ceil(Math.sqrt(MAX_IMAGE_PIXELS)) + 1;
    const oversized = await sharp({
      create: { width: side, height: side, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();

    await expect(parsePng(oversized, 8)).rejects.toThrow(RangeError);
  });

  it('throws a RangeError for a buffer that is not a valid PNG', async () => {
    const garbage = Buffer.from('not a png image', 'utf-8');
    await expect(parsePng(garbage, 8)).rejects.toThrow(RangeError);
  });

  it('throws a RangeError when image dimensions are not exact multiples of casePixels', async () => {
    const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    await expect(parsePng(buffer, 7)).rejects.toThrow(RangeError);
  });

  it('throws a RangeError when casePixels is wrong but still evenly divides the image dimensions', async () => {
    const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
    await expect(parsePng(buffer, 32)).rejects.toThrow(RangeError);
  });
});
