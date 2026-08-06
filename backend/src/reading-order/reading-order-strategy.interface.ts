/**
 * V1 reading orders supported by the HexaRot cipher.
 * The `-ALT` suffix denotes the alternate (boustrophedon) modifier, which
 * reverses the traversal direction at each new row or column.
 */
export type ReadingOrder =
  | 'LR-TB'
  | 'RL-TB'
  | 'TB-LR'
  | 'BT-LR'
  | 'LR-TB-ALT'
  | 'RL-TB-ALT'
  | 'TB-LR-ALT'
  | 'BT-LR-ALT';

/** A single block's position in the block grid (not case coordinates). */
export interface BlockCoordinate {
  x: number;
  y: number;
}

/**
 * Produces the traversal order of pivot blocks across a block grid.
 *
 * Implementations cover every block in the grid exactly once. The
 * returned sequence is the complete linear traversal order - grid
 * construction fills it with message content from the start, and
 * whatever positions remain at the tail become padding (which can span
 * several trailing blocks, not just the last one). Padding placement
 * itself is not modelled at this layer.
 */
export interface ReadingOrderStrategy {
  /** The reading order this strategy implements. */
  readonly id: ReadingOrder;

  /**
   * Returns every block coordinate in this strategy's traversal order.
   *
   * @param widthInBlocks - Grid width, in pivot blocks (not cases). Must be a positive integer.
   * @param heightInBlocks - Grid height, in pivot blocks (not cases). Must be a positive integer.
   */
  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[];
}
