import { CaseSize } from '../shared/types';

/**
 * Hexahue standard palette: colour name (as stored in ColorGrid cells) to
 * hex RGB string. V1 renders only this fixed palette (see CONTEXT.md,
 * "Colour Palette" - alternate themes are out of scope).
 */
export const HEXAHUE_COLOR_HEX: Readonly<Record<string, string>> =
  Object.freeze({
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

/** Pixel size (width and height) of a single colour case, per case-size option. */
export const CASE_PIXELS: Readonly<Record<CaseSize, number>> = Object.freeze({
  small: 8,
  medium: 16,
  large: 32,
});

/**
 * Resolves a Hexahue colour name to its RGB triple.
 *
 * @throws {RangeError} If the colour name is not part of the Hexahue palette.
 */
export function colorNameToRgb(colorName: string): [number, number, number] {
  if (!Object.prototype.hasOwnProperty.call(HEXAHUE_COLOR_HEX, colorName)) {
    throw new RangeError(
      `Unknown colour "${colorName}", expected one of: ${Object.keys(HEXAHUE_COLOR_HEX).join(', ')}`,
    );
  }
  const hex = HEXAHUE_COLOR_HEX[colorName];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
