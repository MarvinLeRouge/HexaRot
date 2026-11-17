import { SvgRenderer } from './svg-renderer';
import { parseSvg } from './svg-parser';
import {
  MOCK_ROTATED_GRID_4x6,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

describe('parseSvg', () => {
  const renderer = new SvgRenderer();

  it.each(['small', 'medium', 'large'] as const)(
    'recovers the original grid from a rendered SVG at size %s',
    (size) => {
      const svg = renderer.render(MOCK_ROTATED_GRID_4x6, size);
      const casePixels = EXPECTED_PNG_DIMENSIONS[size].casePixels;
      const grid = parseSvg(svg, casePixels);
      expect(grid).toEqual(MOCK_ROTATED_GRID_4x6);
    },
  );

  it('throws a RangeError for a string that is not valid SVG', () => {
    expect(() => parseSvg('not svg at all', 8)).toThrow(RangeError);
  });

  it('throws a RangeError when a rect width does not match the expected casePixels', () => {
    const svg = renderer.render(MOCK_ROTATED_GRID_4x6, 'small');
    expect(() => parseSvg(svg, 16)).toThrow(RangeError);
  });

  const wrap = (rects: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  const rect = (x: number, y: number, fill: string) =>
    `<rect x="${x}" y="${y}" width="8" height="8" fill="${fill}"/>`;

  it('parses an SVG holding a single rect into a 1x1 grid', () => {
    expect(parseSvg(wrap(rect(0, 0, '#ff0000')), 8)).toEqual([['red']]);
  });

  it('throws a RangeError when the SVG has no rect elements', () => {
    expect(() => parseSvg(wrap(''), 8)).toThrow(
      'Invalid SVG: no rect elements found',
    );
  });

  it('throws a RangeError when a rect is not aligned to casePixels', () => {
    expect(() => parseSvg(wrap(rect(4, 0, '#ff0000')), 8)).toThrow(
      'rect at (4,0) is not aligned to casePixels=8',
    );
  });

  it('throws a RangeError when the rects leave a hole in the grid', () => {
    const svg = wrap(rect(0, 0, '#ff0000') + rect(8, 8, '#0000ff'));
    expect(() => parseSvg(svg, 8)).toThrow('Missing rect for case (1,0)');
  });
});
