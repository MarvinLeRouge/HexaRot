import { ColorGrid } from '../shared/types';
import { decodeGrid } from './decode-grid';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

describe('decodeGrid', () => {
  const alphabet = new MockAlphabet();

  it('decodes a grid containing only known symbols back to the original characters', () => {
    // MockAlphabet: symbolWidth=3, symbolHeight=2. 'A' block:
    // [['red','green','blue'],['yellow','purple','cyan']]
    // 'B' block:
    // [['green','blue','red'],['purple','cyan','yellow']]
    const grid: ColorGrid = [
      ['red', 'green', 'blue', 'green', 'blue', 'red'],
      ['yellow', 'purple', 'cyan', 'purple', 'cyan', 'yellow'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('AB');
  });

  it('replaces an unrecognized block with the placeholder character', () => {
    const grid: ColorGrid = [
      ['red', 'green', 'blue', 'black', 'black', 'black'],
      ['yellow', 'purple', 'cyan', 'black', 'black', 'black'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('A?');
  });

  it('decodes an all-padding grid (no recognizable blocks) to all placeholders', () => {
    const grid: ColorGrid = [
      ['black', 'black', 'black', 'white', 'white', 'white'],
      ['black', 'black', 'black', 'white', 'white', 'white'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('??');
  });

  it('reads symbols in row-major order across multiple symbol rows', () => {
    // Two symbol rows of one symbol each (grid is 3 wide, 4 tall = 2 symbol rows)
    const grid: ColorGrid = [
      ['red', 'green', 'blue'],
      ['yellow', 'purple', 'cyan'],
      ['green', 'blue', 'red'],
      ['purple', 'cyan', 'yellow'],
    ];
    expect(decodeGrid(grid, alphabet)).toBe('AB');
  });
});
