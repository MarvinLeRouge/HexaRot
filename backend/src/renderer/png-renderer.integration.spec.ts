import sharp from 'sharp';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from './png-renderer';
import {
  MOCK_HEXAHUE_ALPHABET,
  EXPECTED_PNG_DIMENSIONS,
} from './__fixtures__/renderer.fixtures';

/**
 * Runs the full encoding pipeline (preprocess -> buildGrid -> rotate ->
 * render) for a known short message, as required by
 * docs/tests/renderer.md section 3.
 *
 * T=5, LR-TB, sequence [0,90,180,270] (index sequence [0,1,2,3] - see this
 * plan's Global Constraints for why), CW, size medium. No header anywhere
 * in this pipeline - see this plan's "Design decision" note.
 */
async function encodeAndRender(): Promise<Buffer> {
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

  const renderer = new PngRenderer();
  return renderer.render(rotatedGrid, 'medium');
}

describe('PngRenderer - integration', () => {
  it('encodes the message AB with T=5, LR-TB, sequence [0,90,180,270], CW, size medium and produces a PNG whose width equals the expected pixel value', async () => {
    const buffer = await encodeAndRender();
    const meta = await sharp(buffer).metadata();

    const expectedGridWidthInCases = 10; // lcm(pivotBlockSize=5, symbolWidth=2)
    expect(meta.width).toBe(
      expectedGridWidthInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });

  it('encodes the message AB with the same params and produces a PNG whose height equals the expected pixel value', async () => {
    const buffer = await encodeAndRender();
    const meta = await sharp(buffer).metadata();

    const expectedGridHeightInCases = 5; // ceil(symbolHeight=3 / pivotBlockSize=5) * 5
    expect(meta.height).toBe(
      expectedGridHeightInCases * EXPECTED_PNG_DIMENSIONS.medium.casePixels,
    );
  });
});
