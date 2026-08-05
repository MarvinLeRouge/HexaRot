import { MockAlphabet } from './mock-alphabet';
import { UnsupportedCharacterError } from '../../alphabet/errors/unsupported-character.error';

describe('MockAlphabet', () => {
  let alphabet: MockAlphabet;

  beforeEach(() => {
    alphabet = new MockAlphabet();
  });

  it('exposes symbolWidth = 3 and symbolHeight = 2 (deliberately not Hexahue dimensions)', () => {
    expect(alphabet.symbolWidth).toBe(3);
    expect(alphabet.symbolHeight).toBe(2);
  });

  it('returns exactly A-F from getSupportedChars(), no duplicates', () => {
    const chars = alphabet.getSupportedChars();
    expect(chars.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(chars.length).toBe(new Set(chars).size);
  });

  it('returns the correct grid for "A"', () => {
    const grid = alphabet.getBlock('A');
    expect(grid).toEqual([
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
    ]);
  });

  it('returns a 2-row x 3-column grid for every supported character', () => {
    for (const char of alphabet.getSupportedChars()) {
      const grid = alphabet.getBlock(char);
      expect(grid).toHaveLength(2);
      for (const row of grid) {
        expect(row).toHaveLength(3);
      }
    }
  });

  it('throws UnsupportedCharacterError for a character outside A-F', () => {
    expect(() => alphabet.getBlock('Z')).toThrow(UnsupportedCharacterError);
  });

  it('throws UnsupportedCharacterError for lowercase input', () => {
    expect(() => alphabet.getBlock('a')).toThrow(UnsupportedCharacterError);
  });
});
