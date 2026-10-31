import { BadRequestException } from '@nestjs/common';
import { gridDimensions } from '../cipher/build-grid';
import { VisualAlphabet, CaseSize } from '../shared/types';
import { MAX_IMAGE_PIXELS } from '../renderer/image-limits';
import { getCasePixels } from '../renderer/palette';

function imagePixels(
  messageLength: number,
  alphabet: Pick<VisualAlphabet, 'symbolWidth' | 'symbolHeight'>,
  pivotBlockSize: number,
  size: CaseSize,
): { widthPx: number; heightPx: number } {
  const grid = gridDimensions(
    messageLength,
    alphabet.symbolWidth,
    alphabet.symbolHeight,
    pivotBlockSize,
  );
  const casePixels = getCasePixels(size);
  return {
    widthPx: grid.width * casePixels,
    heightPx: grid.height * casePixels,
  };
}

/**
 * Rejects a combination of message length, pivot block size and cryptogram
 * size whose image would be over MAX_IMAGE_PIXELS, before anything is built
 * or rendered. The message tells apart a pivot block size that can never fit
 * this size (even an empty message is over) from a message that is too long.
 * frontend/src/utils/image-budget.ts runs the same check to warn before
 * sending.
 *
 * @throws {BadRequestException} If the image would be over the pixel budget.
 */
export function assertImageFits(
  messageLength: number,
  alphabet: Pick<VisualAlphabet, 'symbolWidth' | 'symbolHeight'>,
  pivotBlockSize: number,
  size: CaseSize,
): void {
  const { widthPx, heightPx } = imagePixels(
    messageLength,
    alphabet,
    pivotBlockSize,
    size,
  );
  if (widthPx * heightPx <= MAX_IMAGE_PIXELS) return;

  const limit = `${(MAX_IMAGE_PIXELS / 1e6).toFixed(1)} million pixels`;
  const smallest = imagePixels(0, alphabet, pivotBlockSize, size);
  if (smallest.widthPx * smallest.heightPx > MAX_IMAGE_PIXELS) {
    throw new BadRequestException(
      `Size ${size} cannot be used with a pivot block size of ${pivotBlockSize}: ` +
        `even an empty message makes an image of ${smallest.widthPx} x ${smallest.heightPx} pixels, ` +
        `over the limit of ${limit}. Use a smaller size or a smaller pivot block size.`,
    );
  }
  throw new BadRequestException(
    `This message is too long for size ${size} with a pivot block size of ${pivotBlockSize}: ` +
      `the image would be ${widthPx} x ${heightPx} pixels, over the limit of ${limit}. ` +
      'Use a smaller size, a smaller pivot block size or a shorter message.',
  );
}
