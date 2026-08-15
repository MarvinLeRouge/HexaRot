import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ColorGrid, CaseSize, Renderer } from '../shared/types';
import { CASE_PIXELS, colorNameToRgb } from './palette';

const CHANNELS = 3; // RGB, no alpha

/**
 * Renders a ColorGrid (message symbols plus random padding, already
 * rotated - no header of any kind) to a PNG buffer using Sharp. Each
 * colour case is painted as a solid casePixels x casePixels square via
 * direct raw-buffer writes - no interpolation, so only exact Hexahue
 * palette colours ever appear in the output.
 */
@Injectable()
export class PngRenderer implements Renderer<Buffer> {
  async render(grid: ColorGrid, size: CaseSize): Promise<Buffer> {
    const gridHeightInCases = grid.length;
    if (gridHeightInCases === 0) {
      throw new RangeError('grid must have at least one row');
    }
    const gridWidthInCases = grid[0].length;
    if (gridWidthInCases === 0) {
      throw new RangeError('grid rows must have at least one case');
    }
    for (const row of grid) {
      if (row.length !== gridWidthInCases) {
        throw new RangeError('grid rows must all have the same length');
      }
    }

    const casePixels = CASE_PIXELS[size];
    if (casePixels === undefined) {
      throw new RangeError(
        `size must be one of: ${Object.keys(CASE_PIXELS).join(', ')}, got "${size}"`,
      );
    }
    const widthPx = gridWidthInCases * casePixels;
    const heightPx = gridHeightInCases * casePixels;

    const pixels = Buffer.alloc(widthPx * heightPx * CHANNELS);

    for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
      for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
        const [r, g, b] = colorNameToRgb(grid[caseY][caseX]);
        const baseX = caseX * casePixels;
        const baseY = caseY * casePixels;

        for (let dy = 0; dy < casePixels; dy++) {
          const rowOffset = (baseY + dy) * widthPx * CHANNELS;
          for (let dx = 0; dx < casePixels; dx++) {
            const pixelOffset = rowOffset + (baseX + dx) * CHANNELS;
            pixels[pixelOffset] = r;
            pixels[pixelOffset + 1] = g;
            pixels[pixelOffset + 2] = b;
          }
        }
      }
    }

    return sharp(pixels, {
      raw: { width: widthPx, height: heightPx, channels: CHANNELS },
    })
      .png()
      .toBuffer();
  }
}
