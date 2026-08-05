import { ReadingOrderRegistry } from './reading-order.registry';
import { ReadingOrder } from './reading-order-strategy.interface';

const ALL_READING_ORDERS: ReadingOrder[] = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

const GRID_SIZES: [number, number][] = [
  [3, 3],
  [1, 4],
  [4, 1],
  [2, 5],
  [5, 2],
];

describe('Reading order strategies - coverage invariants', () => {
  let registry: ReadingOrderRegistry;

  beforeEach(() => {
    registry = new ReadingOrderRegistry();
  });

  for (const order of ALL_READING_ORDERS) {
    for (const [width, height] of GRID_SIZES) {
      it(`${order} covers every block exactly once on a ${width}x${height} grid`, () => {
        const strategy = registry.getStrategy(order);
        const result = strategy.getBlockOrder(width, height);

        expect(result).toHaveLength(width * height);

        const seen = new Set(result.map(({ x, y }) => `${x},${y}`));
        expect(seen.size).toBe(width * height);

        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            expect(seen.has(`${x},${y}`)).toBe(true);
          }
        }
      });
    }
  }
});
