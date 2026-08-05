import { VisualAlphabet, ColorGrid } from '../types';
import { UnsupportedCharacterError } from '../../alphabet/errors/unsupported-character.error';

/**
 * Minimal, self-contained VisualAlphabet double for tests.
 *
 * Deliberately uses 3 wide x 2 tall symbols (not Hexahue's 2 wide x 3 tall) so
 * that contract-level tests exercising VisualAlphabet consumers cannot pass by
 * accidentally assuming Hexahue-specific dimensions.
 */
export class MockAlphabet implements VisualAlphabet {
  readonly symbolWidth = 3;
  readonly symbolHeight = 2;

  private readonly blocks: Record<string, ColorGrid> = {
    A: [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ],
    B: [
      ['green', 'blue', 'red'],
      ['purple', 'cyan', 'yellow'],
    ],
    C: [
      ['blue', 'red', 'green'],
      ['cyan', 'yellow', 'purple'],
    ],
    D: [
      ['yellow', 'purple', 'cyan'],
      ['red', 'green', 'blue'],
    ],
    E: [
      ['purple', 'cyan', 'yellow'],
      ['green', 'blue', 'red'],
    ],
    F: [
      ['cyan', 'yellow', 'purple'],
      ['blue', 'red', 'green'],
    ],
  };

  /**
   * Returns the colour grid for the given character.
   *
   * @throws {UnsupportedCharacterError} If the character is not one of A-F.
   */
  getBlock(char: string): ColorGrid {
    const grid = this.blocks[char];
    if (!grid) {
      throw new UnsupportedCharacterError(char);
    }
    return grid;
  }

  /** Returns the six supported characters: A-F. */
  getSupportedChars(): string[] {
    return Object.keys(this.blocks);
  }
}
