import { ColorGrid, CaseSize } from '../../shared/types';

/** A hardcoded 4-column x 6-row pre-rotated grid, ready for rendering. */
export const MOCK_ROTATED_GRID_4x6: ColorGrid = [
  ['red', 'green', 'blue', 'yellow'],
  ['cyan', 'purple', 'black', 'white'],
  ['gray', 'red', 'green', 'blue'],
  ['yellow', 'cyan', 'purple', 'black'],
  ['white', 'gray', 'red', 'green'],
  ['blue', 'yellow', 'cyan', 'purple'],
];

/** Every Hexahue palette colour mapped to its expected RGB tuple and hex string. */
export const HEXAHUE_PALETTE_MAP: Record<
  string,
  { rgb: [number, number, number]; hex: string }
> = {
  purple: { rgb: [255, 0, 255], hex: '#ff00ff' },
  red: { rgb: [255, 0, 0], hex: '#ff0000' },
  green: { rgb: [102, 255, 0], hex: '#66ff00' },
  yellow: { rgb: [255, 255, 0], hex: '#ffff00' },
  blue: { rgb: [0, 0, 255], hex: '#0000ff' },
  cyan: { rgb: [0, 255, 255], hex: '#00ffff' },
  white: { rgb: [255, 255, 255], hex: '#ffffff' },
  black: { rgb: [0, 0, 0], hex: '#000000' },
  gray: { rgb: [136, 136, 136], hex: '#888888' },
};

/** Case-size -> { casePixels } used by tests to compute expected PNG dimensions. */
export const EXPECTED_PNG_DIMENSIONS: Record<CaseSize, { casePixels: number }> =
  {
    small: { casePixels: 8 },
    medium: { casePixels: 16 },
    large: { casePixels: 32 },
  };
