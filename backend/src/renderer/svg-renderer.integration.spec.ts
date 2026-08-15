import { XMLParser } from 'fast-xml-parser';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { SvgRenderer } from './svg-renderer';
import {
  MOCK_HEXAHUE_ALPHABET,
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

/**
 * Runs the full encoding pipeline (preprocess -> buildGrid -> rotate ->
 * render) for a known short message, as required by
 * docs/tests/renderer.md section 3. Same scenario as PngRenderer's
 * integration test (FEAT-009): T=5, LR-TB, index sequence [0,1,2,3]
 * (representing angles 0,90,180,270 - see FEAT-009's plan for why), CW,
 * size medium. No header anywhere in this pipeline - see this file's
 * sibling png-renderer.integration.spec.ts and docs/tests/renderer.md's
 * "Design note: no visual header row" for the rationale.
 */
function encodeAndRender(): string {
  const alphabet = MOCK_HEXAHUE_ALPHABET;
  const pivotBlockSize = 5;

  const { text } = preprocess('AB', alphabet);
  const bodyGrid = buildGrid(text, alphabet, pivotBlockSize);

  const rotationEngine = new RotationEngine(new ReadingOrderRegistry());
  const rotatedGrid = rotationEngine.encode(
    bodyGrid,
    pivotBlockSize,
    [0, 1, 2, 3],
    'cw',
    'LR-TB',
  );

  const renderer = new SvgRenderer();
  return renderer.render(rotatedGrid, 'medium');
}

describe('SvgRenderer - integration', () => {
  it('encodes the message AB with T=5, LR-TB, sequence [0,90,180,270], CW, size medium and produces an SVG with the correct viewBox', () => {
    const svg = encodeAndRender();
    const parsed = parseSvg(svg);
    const [, , width, height] = parsed.svg.viewBox.split(' ');

    const expectedGridWidthInCases = 10; // widthMultiplier(1) * lcm(pivotBlockSize=5, symbolWidth=2)
    const expectedGridHeightInCases = 5; // ceil(symbolHeight=3 / pivotBlockSize=5) * 5
    expect(Number(width)).toBe(
      expectedGridWidthInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
    expect(Number(height)).toBe(
      expectedGridHeightInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });

  it('encodes the message AB with the same params and produces an SVG with the correct total number of rect elements', () => {
    const svg = encodeAndRender();
    const parsed = parseSvg(svg);
    const rects = Array.isArray(parsed.svg.rect)
      ? parsed.svg.rect
      : [parsed.svg.rect];

    const expectedGridWidthInCases = 10;
    const expectedGridHeightInCases = 5;
    expect(rects.length).toBe(
      expectedGridWidthInCases * expectedGridHeightInCases,
    );
  });
});
