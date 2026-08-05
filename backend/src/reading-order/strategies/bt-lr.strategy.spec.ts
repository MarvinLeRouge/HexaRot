import { BtLrStrategy } from './bt-lr.strategy';

describe('BtLrStrategy', () => {
  it('exposes id "BT-LR" when not alternate', () => {
    expect(new BtLrStrategy().id).toBe('BT-LR');
  });

  it('exposes id "BT-LR-ALT" when alternate', () => {
    expect(new BtLrStrategy(true).id).toBe('BT-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new BtLrStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new BtLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });
});
