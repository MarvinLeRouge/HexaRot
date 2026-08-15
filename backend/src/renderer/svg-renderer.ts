import { Injectable } from '@nestjs/common';
import { ColorGrid, CaseSize, Renderer } from '../shared/types';
import { getCasePixels, colorNameToHex } from './palette';

/**
 * Renders a ColorGrid (message symbols plus random padding, already
 * rotated - no header of any kind) to a self-contained SVG string, using
 * native string templating (no DOM library). Each colour case is painted
 * as one <rect> element.
 */
@Injectable()
export class SvgRenderer implements Renderer<string> {
  render(grid: ColorGrid, size: CaseSize): string {
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

    const casePixels = getCasePixels(size);
    const widthPx = gridWidthInCases * casePixels;
    const heightPx = gridHeightInCases * casePixels;

    const rects: string[] = [];
    for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
      for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
        const hex = colorNameToHex(grid[caseY][caseX]);
        const x = caseX * casePixels;
        const y = caseY * casePixels;
        rects.push(
          `<rect x="${x}" y="${y}" width="${casePixels}" height="${casePixels}" fill="${hex}"/>`,
        );
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPx} ${heightPx}" width="${widthPx}" height="${heightPx}">${rects.join('')}</svg>`;
  }
}
