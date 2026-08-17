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
});
