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
 * Implementations cover every block in the grid exactly once. Padding
 * blocks (added during grid construction) always occupy the trailing
 * positions of whichever block ends up last in the returned sequence -
 * there is no separate padding concept at this layer.
 */
export interface ReadingOrderStrategy {
  /** The reading order this strategy implements. */
  readonly id: ReadingOrder;

  /**
   * Returns every block coordinate in this strategy's traversal order.
   *
   * @param widthInBlocks - Grid width, in pivot blocks (not cases).
   * @param heightInBlocks - Grid height, in pivot blocks (not cases).
   */
  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[];
}
