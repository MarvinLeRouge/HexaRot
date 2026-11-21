/** Shortest rotation sequence a key can hold. */
export const MIN_ROTATION_SEQUENCE_LENGTH = 4
/** Longest rotation sequence a key can hold. */
export const MAX_ROTATION_SEQUENCE_LENGTH = 32
/** Length the forms start on: a 7-character key, 4^8 possible sequences. */
export const DEFAULT_ROTATION_SEQUENCE_LENGTH = 8

/**
 * Draws `length` rotation angle indices (0-3 for 0°, 90°, 180°, 270°),
 * repetitions allowed, using the Web Crypto API so the sequence is not
 * predictable. Draws again if every angle comes out 0°, a sequence the
 * backend rejects since it would leave the message in clear.
 *
 * @param length - Number of angles to draw.
 * @returns A new array of `length` angle indices, not all 0.
 */
export function generateRandomRotationSequence(length = DEFAULT_ROTATION_SEQUENCE_LENGTH): number[] {
  const draw = new Uint8Array(length)
  let sequence: number[]
  do {
    crypto.getRandomValues(draw)
    // 256 is a multiple of 4, so the low 2 bits are uniform.
    sequence = Array.from(draw, (byte) => byte & 3)
  } while (sequence.every((angle) => angle === 0))
  return sequence
}

/** True if a sequence would leave the message in clear (every angle 0°). */
export function isAllZeroRotationSequence(sequence: number[]): boolean {
  return sequence.every((angle) => angle === 0)
}
