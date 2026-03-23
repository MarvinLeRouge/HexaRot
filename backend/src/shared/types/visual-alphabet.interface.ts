import { ColorGrid } from './color-grid.type';

/**
 * Contract for a grid-based, character-by-character visual alphabet.
 *
 * Each character maps to a rectangular {@link ColorGrid} of fixed dimensions
 * (`symbolWidth` columns × `symbolHeight` rows). Implementations are responsible
 * for loading and exposing their character set.
 */
export interface VisualAlphabet {
  /** Number of colour cases per symbol along the x-axis. */
  readonly symbolWidth: number;

  /** Number of colour cases per symbol along the y-axis. */
  readonly symbolHeight: number;

  /**
   * Returns the colour grid for the given character.
   *
   * @param char - The character to look up (single character string).
   * @throws {UnsupportedCharacterError} If the character is not part of the alphabet.
   */
  getBlock(char: string): ColorGrid;

  /**
   * Returns all characters supported by this alphabet.
   * For characters with multiple variants, only the base character is returned.
   */
  getSupportedChars(): string[];
}
