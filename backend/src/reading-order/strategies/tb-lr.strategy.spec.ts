import { TbLrStrategy } from './tb-lr.strategy';

describe('TbLrStrategy', () => {
  it('exposes id "TB-LR" when not alternate', () => {
    expect(new TbLrStrategy().id).toBe('TB-LR');
  });

  it('exposes id "TB-LR-ALT" when alternate', () => {
    expect(new TbLrStrategy(true).id).toBe('TB-LR-ALT');
  });

  it('produces the correct sequence for a 3x3 grid, no alternate', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('produces the correct sequence for a 3x3 grid, alternate (boustrophedon)', () => {
    const strategy = new TbLrStrategy(true);
    expect(strategy.getBlockOrder(3, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('handles a 1-wide, 4-tall grid (1xN)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(1, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ]);
  });

  it('handles a 4-wide, 1-tall grid (Nx1)', () => {
    const strategy = new TbLrStrategy();
    expect(strategy.getBlockOrder(4, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });
});
