/**
 * Thrown when a character is not part of a {@link VisualAlphabet}.
 */
export class UnsupportedCharacterError extends Error {
  constructor(char: string) {
    super(`Character "${char}" is not supported by this alphabet`);
    this.name = 'UnsupportedCharacterError';
  }
}
