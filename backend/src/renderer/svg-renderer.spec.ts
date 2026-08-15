import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ColorGrid } from '../shared/types';
import { SvgRenderer } from './svg-renderer';
import {
  MOCK_ROTATED_GRID_4x6,
  HEXAHUE_PALETTE_MAP,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

/** Shape of a parsed `<rect>` element's attributes, as returned by fast-xml-parser. */
interface ParsedSvgRect {
  x: string;
  y: string;
  width: string;
  height: string;
  fill: string;
}

/** Shape of a parsed SVG document, as returned by fast-xml-parser. */
interface ParsedSvgDocument {
  svg: {
    viewBox: string;
    rect: ParsedSvgRect | ParsedSvgRect[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

/** Parses an SVG string, typing fast-xml-parser's otherwise-`any` result. */
function parseSvg(svg: string): ParsedSvgDocument {
  return parser.parse(svg) as ParsedSvgDocument;
}

/** Normalises a parsed `rect` field (single object or array) to an array. */
function toRectArray(rect: ParsedSvgRect | ParsedSvgRect[]): ParsedSvgRect[] {
  return Array.isArray(rect) ? rect : [rect];
}

describe('SvgRenderer', () => {
  const renderer = new SvgRenderer();

  describe('interface compliance', () => {
    it('exposes a render(grid, size) method returning a string', () => {
      const result = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(typeof result).toBe('string');
    });
  });

  describe('output validity', () => {
    it('returns a string starting with <svg', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(svg.startsWith('<svg')).toBe(true);
    });

    it('returns a well-formed SVG (parseable by a standard XML parser)', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const validation = XMLValidator.validate(svg);
      expect(validation).toBe(true);
    });

    it('is self-contained: no external href, src, or xlink references', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      expect(svg).not.toContain('href=');
      expect(svg).not.toContain('src=');
      expect(svg).not.toContain('xlink');
    });
  });

  describe('viewBox', () => {
    it('sets viewBox width = gridWidthInCases x caseSize for size: small', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parseSvg(svg);
      const [, , width] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('sets viewBox height = gridHeightInCases x caseSize for size: small', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parseSvg(svg);
      const [, , , height] = parsed.svg.viewBox.split(' ');
      expect(Number(height)).toBe(6 * EXPECTED_PNG_DIMENSIONS.small.casePixels);
    });

    it('sets correct viewBox for size: medium', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'medium');
      const parsed = parseSvg(svg);
      const [, , width, height] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.medium.casePixels);
      expect(Number(height)).toBe(
        6 * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
      );
    });

    it('sets correct viewBox for size: large', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'large');
      const parsed = parseSvg(svg);
      const [, , width, height] = parsed.svg.viewBox.split(' ');
      expect(Number(width)).toBe(4 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
      expect(Number(height)).toBe(6 * EXPECTED_PNG_DIMENSIONS.large.casePixels);
    });
  });

  describe('rect elements', () => {
    it('produces exactly gridWidthInCases x gridHeightInCases rect elements', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parseSvg(svg);
      const rects = toRectArray(parsed.svg.rect);
      expect(rects.length).toBe(4 * 6);
    });

    it('sets the fill attribute of each rect to the correct Hexahue hex colour value', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;
      const parsed = parseSvg(svg);
      const rects = toRectArray(parsed.svg.rect);

      for (const rect of rects) {
        const caseX = Number(rect.x) / casePixels;
        const caseY = Number(rect.y) / casePixels;
        const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
        expect(rect.fill).toBe(HEXAHUE_PALETTE_MAP[colorName].hex);
      }
    });

    it('sets x, y, width, height attributes on every rect', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const parsed = parseSvg(svg);
      const rects = toRectArray(parsed.svg.rect);

      for (const rect of rects) {
        expect(rect.x).toBeDefined();
        expect(rect.y).toBeDefined();
        expect(Number(rect.width)).toBe(
          EXPECTED_PNG_DIMENSIONS.small.casePixels,
        );
        expect(Number(rect.height)).toBe(
          EXPECTED_PNG_DIMENSIONS.small.casePixels,
        );
      }
    });
  });

  describe('colour accuracy', () => {
    it('maps each Hexahue palette colour to the correct hex colour string', () => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
      const casePixels = EXPECTED_PNG_DIMENSIONS.small.casePixels;

      for (let caseY = 0; caseY < MOCK_ROTATED_GRID_4x6.length; caseY++) {
        for (
          let caseX = 0;
          caseX < MOCK_ROTATED_GRID_4x6[caseY].length;
          caseX++
        ) {
          const colorName = MOCK_ROTATED_GRID_4x6[caseY][caseX];
          const expectedHex = HEXAHUE_PALETTE_MAP[colorName].hex;
          const x = caseX * casePixels;
          const y = caseY * casePixels;
          expect(svg).toContain(
            `x="${x}" y="${y}" width="${casePixels}" height="${casePixels}" fill="${expectedHex}"`,
          );
        }
      }
    });
  });

  describe('input validation', () => {
    it('throws a RangeError for an empty grid (zero rows)', () => {
      expect(() => renderer.render([], 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for a grid with a zero-length row', () => {
      expect(() => renderer.render([[]], 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for a grid with inconsistent row lengths', () => {
      const raggedGrid: ColorGrid = [['red', 'green'], ['blue']];
      expect(() => renderer.render(raggedGrid, 'small')).toThrow(RangeError);
    });

    it('throws a RangeError for an invalid size value', () => {
      expect(() =>
        renderer.render(MOCK_ROTATED_GRID_4x6, 'huge' as never),
      ).toThrow(RangeError);
    });
  });
});
