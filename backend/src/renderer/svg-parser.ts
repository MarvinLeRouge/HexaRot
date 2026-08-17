import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ColorGrid } from '../shared/types';
import { hexToColorName } from './palette';

interface ParsedSvgRect {
  x: string | number;
  y: string | number;
  width: string | number;
  fill: string;
}

interface ParsedSvgDocument {
  svg?: {
    rect?: ParsedSvgRect | ParsedSvgRect[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

/**
 * Parses an SVG string (produced by SvgRenderer) back into a ColorGrid.
 * Self-describing: each <rect>'s own x/y/width attributes give its exact
 * case position and size, no assumption about image dimensions needed
 * beyond the expected casePixels itself.
 *
 * @throws {RangeError} If the string is not well-formed SVG, has no rect
 *   elements, a rect's width does not match casePixels, or the rects do
 *   not tile a complete rectangular grid with no gaps.
 */
export function parseSvg(svgString: string, casePixels: number): ColorGrid {
  const validation = XMLValidator.validate(svgString);
  if (validation !== true) {
    throw new RangeError(
      `Invalid SVG: ${validation.err.msg} at line ${validation.err.line}`,
    );
  }

  const parsed = parser.parse(svgString) as ParsedSvgDocument;
  const rectsRaw = parsed.svg?.rect;
  if (!rectsRaw) {
    throw new RangeError('Invalid SVG: no rect elements found');
  }
  const rects = Array.isArray(rectsRaw) ? rectsRaw : [rectsRaw];

  const cells = new Map<string, string>();
  let maxCaseX = 0;
  let maxCaseY = 0;

  for (const rect of rects) {
    const x = Number(rect.x);
    const y = Number(rect.y);
    const width = Number(rect.width);

    if (width !== casePixels) {
      throw new RangeError(
        `rect width ${width} does not match expected casePixels=${casePixels}`,
      );
    }
    if (x % casePixels !== 0 || y % casePixels !== 0) {
      throw new RangeError(
        `rect at (${x},${y}) is not aligned to casePixels=${casePixels}`,
      );
    }

    const caseX = x / casePixels;
    const caseY = y / casePixels;
    maxCaseX = Math.max(maxCaseX, caseX);
    maxCaseY = Math.max(maxCaseY, caseY);
    cells.set(`${caseX},${caseY}`, hexToColorName(rect.fill));
  }

  const gridWidthInCases = maxCaseX + 1;
  const gridHeightInCases = maxCaseY + 1;

  const grid: ColorGrid = [];
  for (let caseY = 0; caseY < gridHeightInCases; caseY++) {
    const row: string[] = [];
    for (let caseX = 0; caseX < gridWidthInCases; caseX++) {
      const color = cells.get(`${caseX},${caseY}`);
      if (color === undefined) {
        throw new RangeError(`Missing rect for case (${caseX},${caseY})`);
      }
      row.push(color);
    }
    grid.push(row);
  }

  return grid;
}
