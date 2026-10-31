import { gridDimensions } from './build-grid';
import { MAX_ENCODE_MESSAGE_LENGTH } from './max-message-length';
import { MAX_IMAGE_PIXELS } from '../renderer/image-limits';

const MEDIUM_CASE_PIXELS = 16;
const PIVOT_BLOCK_SIZES = Array.from({ length: 255 }, (_, i) => i + 1);

describe('MAX_ENCODE_MESSAGE_LENGTH', () => {
  it.each(PIVOT_BLOCK_SIZES)(
    'keeps a maximum-length Hexahue message within the image pixel budget at size medium, pivot %i',
    (pivotBlockSize) => {
      const { width, height } = gridDimensions(
        MAX_ENCODE_MESSAGE_LENGTH,
        2,
        3,
        pivotBlockSize,
      );

      expect(
        width * height * MEDIUM_CASE_PIXELS * MEDIUM_CASE_PIXELS,
      ).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
    },
  );
});
