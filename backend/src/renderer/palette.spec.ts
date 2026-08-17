import {
  HEXAHUE_COLOR_HEX,
  CASE_PIXELS,
  colorNameToRgb,
  colorNameToHex,
  getCasePixels,
  hexToColorName,
  rgbToColorName,
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

describe('hexToColorName', () => {
  it('resolves each of the 9 palette hex values back to its colour name', () => {
    expect(hexToColorName('#ff00ff')).toBe('purple');
    expect(hexToColorName('#ff0000')).toBe('red');
    expect(hexToColorName('#66ff00')).toBe('green');
    expect(hexToColorName('#ffff00')).toBe('yellow');
    expect(hexToColorName('#0000ff')).toBe('blue');
    expect(hexToColorName('#00ffff')).toBe('cyan');
    expect(hexToColorName('#ffffff')).toBe('white');
    expect(hexToColorName('#000000')).toBe('black');
    expect(hexToColorName('#888888')).toBe('gray');
  });

  it('throws a RangeError for a hex value outside the Hexahue palette', () => {
    expect(() => hexToColorName('#123456')).toThrow(RangeError);
  });
});

describe('rgbToColorName', () => {
  it('resolves each of the 9 palette RGB triples back to its colour name', () => {
    expect(rgbToColorName(255, 0, 255)).toBe('purple');
    expect(rgbToColorName(255, 0, 0)).toBe('red');
    expect(rgbToColorName(102, 255, 0)).toBe('green');
    expect(rgbToColorName(255, 255, 0)).toBe('yellow');
    expect(rgbToColorName(0, 0, 255)).toBe('blue');
    expect(rgbToColorName(0, 255, 255)).toBe('cyan');
    expect(rgbToColorName(255, 255, 255)).toBe('white');
    expect(rgbToColorName(0, 0, 0)).toBe('black');
    expect(rgbToColorName(136, 136, 136)).toBe('gray');
  });

  it('throws a RangeError for an RGB triple outside the Hexahue palette', () => {
    expect(() => rgbToColorName(1, 2, 3)).toThrow(RangeError);
  });
});
