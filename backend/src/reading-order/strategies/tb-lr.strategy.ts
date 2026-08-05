import {
  BlockCoordinate,
  ReadingOrder,
  ReadingOrderStrategy,
} from '../reading-order-strategy.interface';

/**
 * Top-to-bottom, left-to-right block traversal (columns first).
 * With `alternate`, direction flips to bottom-to-top on every second column
 * (boustrophedon), starting with column 0 unreversed.
 */
export class TbLrStrategy implements ReadingOrderStrategy {
  readonly id: ReadingOrder;

  constructor(private readonly alternate: boolean = false) {
    this.id = alternate ? 'TB-LR-ALT' : 'TB-LR';
  }

  getBlockOrder(
    widthInBlocks: number,
    heightInBlocks: number,
  ): BlockCoordinate[] {
    const coords: BlockCoordinate[] = [];
    for (let x = 0; x < widthInBlocks; x++) {
      const reversed = this.alternate && x % 2 === 1;
      if (reversed) {
        for (let y = heightInBlocks - 1; y >= 0; y--) coords.push({ x, y });
      } else {
        for (let y = 0; y < heightInBlocks; y++) coords.push({ x, y });
      }
    }
    return coords;
  }
}
