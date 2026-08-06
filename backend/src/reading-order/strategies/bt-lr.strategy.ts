import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Bottom-to-top, left-to-right block traversal (columns first).
 * With `alternate`, direction flips to top-to-bottom on every second column
 * (boustrophedon), starting with column 0 unreversed.
 */
export class BtLrStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'BT-LR-ALT' : 'BT-LR';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let x = 0; x < widthInBlocks; x++) {
      const reversed = this.alternate && x % 2 === 1;
      if (reversed) {
        for (let y = 0; y < heightInBlocks; y++) coords.push({ x, y });
      } else {
        for (let y = heightInBlocks - 1; y >= 0; y--) coords.push({ x, y });
      }
    }
    return coords;
  }
}
