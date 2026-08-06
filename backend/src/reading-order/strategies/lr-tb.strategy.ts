import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Left-to-right, top-to-bottom block traversal.
 * With `alternate`, direction flips to right-to-left on every second row
 * (boustrophedon), starting with row 0 unreversed.
 */
export class LrTbStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'LR-TB-ALT' : 'LR-TB';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let y = 0; y < heightInBlocks; y++) {
      const reversed = this.alternate && y % 2 === 1;
      if (reversed) {
        for (let x = widthInBlocks - 1; x >= 0; x--) coords.push({ x, y });
      } else {
        for (let x = 0; x < widthInBlocks; x++) coords.push({ x, y });
      }
    }
    return coords;
  }
}
