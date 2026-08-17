import sharp from 'sharp';
import { ColorGrid } from '../shared/types';
import { rgbToColorName } from './palette';

/**
 * Parses a PNG buffer (produced by PngRenderer) back into a ColorGrid.
 * Samples each case's top-left pixel - every pixel within a case is
 * identical by construction (PngRenderer paints solid, non-interpolated
 * blocks) - and matches it exactly against the fixed Hexahue palette.
 *
 * Known limitation: this cannot detect a casePixels value that is a proper
 * divisor of the real one (e.g. parsing a 16px-case image as if it used
 * 8px cases). In that case every sampled sub-block still sits entirely
 * inside one real, monochrome case, so no local pixel comparison can tell
 * the two apart without risking false positives on legitimate data (real
 * neighbouring cases can and do share colours). It reliably catches a
 * casePixels value that is too large, or otherwise does not evenly align
 * with the real case boundaries.
 *
 * @throws {RangeError} If the buffer is not a valid image, its dimensions
 *   are not exact multiples of casePixels, or a case is not monochrome
 *   (which happens when casePixels is wrong and misaligned with the real
 *   case boundaries).
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
    // Bound the maximum decoded pixel count: HexaRot images are small
    // colour-block grids, not photographs, so 16000x16000 is more than
    // enough headroom while closing off unbounded decompression
    // amplification from arbitrary caller-supplied PNG input.
    const raw = await sharp(buffer, { limitInputPixels: 16000 * 16000 })
      .raw()
      .toBuffer({ resolveWithObject: true });
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

      // Sample a second pixel (the case's bottom-right corner): every pixel
      // within a real case is identical by construction, so a mismatch here
      // means this case straddles a real case boundary, i.e. casePixels
      // does not match the image actually being parsed (see the "Known
      // limitation" note above for the one class of mismatch this misses).
      const px2 = px + casePixels - 1;
      const py2 = py + casePixels - 1;
      const offset2 = (py2 * width + px2) * channels;

      if (
        data[offset] !== data[offset2] ||
        data[offset + 1] !== data[offset2 + 1] ||
        data[offset + 2] !== data[offset2 + 2]
      ) {
        throw new RangeError(
          `Case at (${caseX}, ${caseY}) is not monochrome, casePixels=${casePixels} is likely wrong`,
        );
      }

      row.push(
        rgbToColorName(data[offset], data[offset + 1], data[offset + 2]),
      );
    }
    grid.push(row);
  }

  return grid;
}
