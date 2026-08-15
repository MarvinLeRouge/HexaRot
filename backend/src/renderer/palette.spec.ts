import {
  HEXAHUE_COLOR_HEX,
  CASE_PIXELS,
  colorNameToRgb,
  colorNameToHex,
  getCasePixels,
} from './palette';

describe('HEXAHUE_COLOR_HEX', () => {
  it('maps all 9 Hexahue palette colours to their exact hex value', () => {
    expect(HEXAHUE_COLOR_HEX).toEqual({
      purple: '#ff00ff',
      red: '#ff0000',
      green: '#66ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      cyan: '#00ffff',
      white: '#ffffff',
      black: '#000000',
      gray: '#888888',
    });
  });
});

describe('CASE_PIXELS', () => {
  it('maps each case size to its pixel-per-case value', () => {
    expect(CASE_PIXELS).toEqual({ small: 8, medium: 16, large: 32 });
  });
});

describe('colorNameToRgb', () => {
  it('resolves each of the 9 palette colours to the correct RGB triple', () => {
    expect(colorNameToRgb('purple')).toEqual([255, 0, 255]);
    expect(colorNameToRgb('red')).toEqual([255, 0, 0]);
    expect(colorNameToRgb('green')).toEqual([102, 255, 0]);
    expect(colorNameToRgb('yellow')).toEqual([255, 255, 0]);
    expect(colorNameToRgb('blue')).toEqual([0, 0, 255]);
    expect(colorNameToRgb('cyan')).toEqual([0, 255, 255]);
    expect(colorNameToRgb('white')).toEqual([255, 255, 255]);
    expect(colorNameToRgb('black')).toEqual([0, 0, 0]);
    expect(colorNameToRgb('gray')).toEqual([136, 136, 136]);
  });

  it('throws a RangeError for a colour name outside the Hexahue palette', () => {
    expect(() => colorNameToRgb('magenta')).toThrow(RangeError);
    expect(() => colorNameToRgb('')).toThrow(RangeError);
  });

  it('throws a RangeError for colour names that match Object.prototype members', () => {
    expect(() => colorNameToRgb('constructor')).toThrow(RangeError);
    expect(() => colorNameToRgb('toString')).toThrow(RangeError);
  });
});

describe('colorNameToHex', () => {
  it('resolves each of the 9 palette colours to its exact hex string', () => {
    expect(colorNameToHex('purple')).toBe('#ff00ff');
    expect(colorNameToHex('red')).toBe('#ff0000');
    expect(colorNameToHex('green')).toBe('#66ff00');
    expect(colorNameToHex('yellow')).toBe('#ffff00');
    expect(colorNameToHex('blue')).toBe('#0000ff');
    expect(colorNameToHex('cyan')).toBe('#00ffff');
    expect(colorNameToHex('white')).toBe('#ffffff');
    expect(colorNameToHex('black')).toBe('#000000');
    expect(colorNameToHex('gray')).toBe('#888888');
  });

  it('throws a RangeError for a colour name outside the Hexahue palette', () => {
    expect(() => colorNameToHex('magenta')).toThrow(RangeError);
    expect(() => colorNameToHex('')).toThrow(RangeError);
  });

  it('throws a RangeError for a colour name matching an Object.prototype member', () => {
    expect(() => colorNameToHex('constructor')).toThrow(RangeError);
    expect(() => colorNameToHex('toString')).toThrow(RangeError);
  });
});

describe('getCasePixels', () => {
  it('resolves each case size to its pixel-per-case value', () => {
    expect(getCasePixels('small')).toBe(8);
    expect(getCasePixels('medium')).toBe(16);
    expect(getCasePixels('large')).toBe(32);
  });

  it('throws a RangeError for an invalid size value', () => {
    expect(() =>
      getCasePixels('huge' as unknown as Parameters<typeof getCasePixels>[0]),
    ).toThrow(RangeError);
  });
});
