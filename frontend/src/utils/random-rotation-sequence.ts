/**
 * Draws a uniformly random permutation of the rotation angle indices
 * [0, 1, 2, 3] (Fisher-Yates), using the Web Crypto API so the default
 * sequence is not predictable.
 *
 * @returns A new array holding a permutation of [0, 1, 2, 3].
 */
export function generateRandomRotationSequence(): number[] {
  const sequence = [0, 1, 2, 3]
  const draw = new Uint32Array(1)
  for (let i = sequence.length - 1; i > 0; i--) {
    crypto.getRandomValues(draw)
    // Modulo bias on a 32-bit draw over at most 4 values is about 2^-32, negligible here.
    const j = draw[0] % (i + 1)
    ;[sequence[i], sequence[j]] = [sequence[j], sequence[i]]
  }
  return sequence
}
