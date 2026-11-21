import { BadRequestException } from '@nestjs/common';
import type { RotationSequence } from '../key/key-codec';

/**
 * Rejects a rotation sequence that leaves every block of this grid at 0°.
 * Block i gets `rotationSequence[i % length]`, whatever the reading order,
 * so a grid of N blocks only uses the first min(N, length) angles: if those
 * are all 0°, the cryptogram is the plain message, even though the sequence
 * as a whole is not only 0° rotations.
 *
 * @param blockCount - Number of pivot blocks in the grid (at least 1).
 * @throws {BadRequestException} If every angle the grid uses is 0°.
 */
export function assertGridRotated(
  blockCount: number,
  rotationSequence: RotationSequence,
): void {
  const usedAngles = rotationSequence.slice(0, blockCount);
  if (usedAngles.every((angle) => angle === 0)) {
    throw new BadRequestException(
      `this rotation sequence leaves every block of this message unrotated, so the cryptogram would be the message in clear: put a non-zero angle among its first ${usedAngles.length} entries`,
    );
  }
}
