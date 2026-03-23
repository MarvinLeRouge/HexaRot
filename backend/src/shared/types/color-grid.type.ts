/**
 * A 2D grid of colour values representing a visual symbol.
 *
 * Indexed as `grid[row][col]`, where `row` corresponds to the y-axis (top to
 * bottom) and `col` corresponds to the x-axis (left to right).
 *
 * @example
 * // For a Hexahue symbol (2 cols × 3 rows):
 * // grid[0][0]  grid[0][1]
 * // grid[1][0]  grid[1][1]
 * // grid[2][0]  grid[2][1]
 */
export type ColorGrid = string[][];
