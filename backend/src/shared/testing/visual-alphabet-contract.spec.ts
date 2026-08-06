import { MockAlphabet } from '../../../test/utils/mock-alphabet';

describe('VisualAlphabet contract (dimension-agnostic, via MockAlphabet)', () => {
  let alphabet: MockAlphabet;

  beforeEach(() => {
    alphabet = new MockAlphabet();
  });

  it("reports dimensions other than Hexahue's 2x3, to prove no test hardcodes them", () => {
    expect(alphabet.symbolWidth).not.toBe(2);
    expect(alphabet.symbolHeight).not.toBe(3);
  });

  it('every supported character returns a grid matching symbolHeight rows x symbolWidth columns', () => {
    for (const char of alphabet.getSupportedChars()) {
      const grid = alphabet.getBlock(char);
      expect(grid).toHaveLength(alphabet.symbolHeight);
      for (const row of grid) {
        expect(row).toHaveLength(alphabet.symbolWidth);
      }
    }
  });

  it('every cell of every supported character is a non-empty colour string', () => {
    for (const char of alphabet.getSupportedChars()) {
      for (const row of alphabet.getBlock(char)) {
        for (const color of row) {
          expect(typeof color).toBe('string');
          expect(color.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('getSupportedChars() has no duplicate entries', () => {
    const chars = alphabet.getSupportedChars();
    expect(chars.length).toBe(new Set(chars).size);
  });

  it('getBlock() throws for a character outside the supported set', () => {
    expect(() => alphabet.getBlock('Z')).toThrow();
  });
});
