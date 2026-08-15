import sharp from 'sharp';
import { ColorGrid } from '../shared/types';
import { PngRenderer } from './png-renderer';
import {
  MOCK_ROTATED_GRID_4x6,
  HEXAHUE_PALETTE_MAP,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

describe('PngRenderer', () => {
  const renderer = new PngRenderer();

  describe('interface compliance', () => {
    it('exposes a render(grid, size) method returning a Promise<Buffer>', () => {
      const result = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(result).toBeInstanceOf(Promise);
      return result.then((buffer) => {
        expect(Buffer.isBuffer(buffer)).toBe(true);
      });
    });
  });

  describe('output validity', () => {
    it('returns a Buffer (not null, not undefined)', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(buffer).not.toBeNull();
      expect(buffer).not.toBeUndefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('returns a buffer whose first bytes match the PNG magic number', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(buffer.subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
    });
  });

  describe('dimensions - case size: small (8px per case)', () => {
    it('produces an image of width = gridWidthInCases x 8', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 8', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });
  });

  describe('dimensions - case size: medium (16px per case)', () => {
    it('produces an image of width = gridWidthInCases x 16', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 16', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
    });
  });

  describe('dimensions - case size: large (32px per case)', () => {
    it('produces an image of width = gridWidthInCases x 32', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const meta = await sharp(buffer).metadata();
      expect(meta.width).toBe(4 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });

    it('produces an image of height = gridHeightInCases x 32', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const meta = await sharp(buffer).metadata();
      expect(meta.height).toBe(6 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });
  });

  describe('colour accuracy', () => {
    it('maps each Hexahue palette colour to the correct RGB value', async () => {
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      for (let caseY = 0; caseY < MOCK_ROTATED_GRID_4x6.length; caseY++) {
        for (
          let caseX = 0;
          caseX < MOCK_ROTATED_GRID_4x6[caseY].length;
          caseX++
        ) {
          const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
          const expectedRgb = HEXAHUE_PALETTE_MAP[colorName].rgb;
          const px = caseX * casePixels;
          const py = caseY * casePixels;
          const offset = (py * info.width + px) * info.channels;
          expect([data[offset], data[offset + 1], data[offset + 2]]).toEqual(
            expectedRgb,
          );
        }
      }
    });

    it('does not introduce colours outside the Hexahue palette for non-padding cells', async () => {
      const buffer = await renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const knownRgbs = new Set(
        Object.values(HEXAHUE_PALETTE_MAP).map(({ rgb }) => rgb.join(',')),
      );

      for (let i = 0; i < data.length; i += info.channels) {
        const pixel = [data[i], data[i + 1], data[i + 2]].join(',');
        expect(knownRgbs.has(pixel)).toBe(true);
      }
    });
  });

  describe('input validation', () => {
    it('throws a RangeError for an empty grid (zero rows)', async () => {
      await expect(renderer.render([], 'small')).rejects.toThrow(RangeError);
    });

    it('throws a RangeError for a grid with a zero-length row', async () => {
      await expect(renderer.render([[]], 'small')).rejects.toThrow(RangeError);
    });

    it('throws a RangeError for a grid with inconsistent row lengths', async () => {
      const raggedGrid: ColorGrid = [['red', 'green'], ['blue']];
      await expect(renderer.render(raggedGrid, 'small')).rejects.toThrow(
        RangeError,
      );
    });
  });
});
