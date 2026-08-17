import sharp from 'sharp';
import { ColorGrid } from '../shared/types';
import { rgbToColorName } from './palette';

/**
 * Parses a PNG buffer (produced by PngRenderer) back into a ColorGrid.
 * Samples each case's top-left pixel - every pixel within a case is
 * identical by construction (PngRenderer paints solid, non-interpolated
 * blocks) - and matches it exactly against the fixed Hexahue palette.
 *
 * @throws {RangeError} If the buffer is not a valid image, or its
 *   dimensions are not exact multiples of casePixels.
 */
export async function parsePng(
  buffer: Buffer,
  casePixels: number,
): Promise<ColorGrid> {
  let data: Buffer;
  let width: number;
  let height: number;
  let channels: number;

  try {
    const raw = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    data = raw.data;
    width = raw.info.width;
    height = raw.info.height;
    channels = raw.info.channels;
  } catch (err) {
    throw new RangeError(`Invalid PNG image: ${(err as Error).message}`);
  }

  if (width % casePixels !== 0 || height % casePixels !== 0) {
    throw new RangeError(
      `Image dimensions ${width}x${height} are not exact multiples of casePixels=${casePixels}`,
    );
  }

  const gridWidthInCases = width / casePixels;
  const gridHeightInCases = height / casePixels;

  const grid: ColorGrid = [];
  for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
    const row: string[] = [];
    for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
      const px = caseX * casePixels;
      const py = caseY * casePixels;
      const offset = (py * width + px) * channels;
      row.push(
        rgbToColorName(data[offset], data[offset + 1], data[offset + 2]),
      );
    }
    grid.push(row);
  }

  return grid;
}
