import { ReadingOrderRegistry } from './reading-order.registry';
import { LrTbStrategy } from './strategies/lr-tb.strategy';
import { RlTbStrategy } from './strategies/rl-tb.strategy';
import { TbLrStrategy } from './strategies/tb-lr.strategy';
import { BtLrStrategy } from './strategies/bt-lr.strategy';

describe('ReadingOrderRegistry', () => {
  let registry: ReadingOrderRegistry;

  beforeEach(() => {
    registry = new ReadingOrderRegistry();
  });

  it('resolves LR-TB to a non-alternate LrTbStrategy', () => {
    const strategy = registry.getStrategy('LR-TB');
    expect(strategy).toBeInstanceOf(LrTbStrategy);
    expect(strategy.id).toBe('LR-TB');
  });

  it('resolves LR-TB-ALT to an alternate LrTbStrategy', () => {
    const strategy = registry.getStrategy('LR-TB-ALT');
    expect(strategy).toBeInstanceOf(LrTbStrategy);
    expect(strategy.id).toBe('LR-TB-ALT');
  });

  it('resolves RL-TB to a non-alternate RlTbStrategy', () => {
    const strategy = registry.getStrategy('RL-TB');
    expect(strategy).toBeInstanceOf(RlTbStrategy);
    expect(strategy.id).toBe('RL-TB');
  });

  it('resolves RL-TB-ALT to an alternate RlTbStrategy', () => {
    const strategy = registry.getStrategy('RL-TB-ALT');
    expect(strategy).toBeInstanceOf(RlTbStrategy);
    expect(strategy.id).toBe('RL-TB-ALT');
  });

  it('resolves TB-LR to a non-alternate TbLrStrategy', () => {
    const strategy = registry.getStrategy('TB-LR');
    expect(strategy).toBeInstanceOf(TbLrStrategy);
    expect(strategy.id).toBe('TB-LR');
  });

  it('resolves TB-LR-ALT to an alternate TbLrStrategy', () => {
    const strategy = registry.getStrategy('TB-LR-ALT');
    expect(strategy).toBeInstanceOf(TbLrStrategy);
    expect(strategy.id).toBe('TB-LR-ALT');
  });

  it('resolves BT-LR to a non-alternate BtLrStrategy', () => {
    const strategy = registry.getStrategy('BT-LR');
    expect(strategy).toBeInstanceOf(BtLrStrategy);
    expect(strategy.id).toBe('BT-LR');
  });

  it('resolves BT-LR-ALT to an alternate BtLrStrategy', () => {
    const strategy = registry.getStrategy('BT-LR-ALT');
    expect(strategy).toBeInstanceOf(BtLrStrategy);
    expect(strategy.id).toBe('BT-LR-ALT');
  });
});
