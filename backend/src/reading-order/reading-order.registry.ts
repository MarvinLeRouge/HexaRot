import { Injectable } from '@nestjs/common';
import {
  ReadingOrder,
  ReadingOrderStrategy,
} from './reading-order-strategy.interface';
import { LrTbStrategy } from './strategies/lr-tb.strategy';
import { RlTbStrategy } from './strategies/rl-tb.strategy';
import { TbLrStrategy } from './strategies/tb-lr.strategy';
import { BtLrStrategy } from './strategies/bt-lr.strategy';

/**
 * Resolves a ReadingOrder value to its concrete ReadingOrderStrategy
 * implementation.
 */
@Injectable()
export class ReadingOrderRegistry {
  private readonly strategies: Record<ReadingOrder, ReadingOrderStrategy> = {
    'LR-TB': new LrTbStrategy(false),
    'RL-TB': new RlTbStrategy(false),
    'TB-LR': new TbLrStrategy(false),
    'BT-LR': new BtLrStrategy(false),
    'LR-TB-ALT': new LrTbStrategy(true),
    'RL-TB-ALT': new RlTbStrategy(true),
    'TB-LR-ALT': new TbLrStrategy(true),
    'BT-LR-ALT': new BtLrStrategy(true),
  };

  /** Returns the strategy implementing the given reading order. */
  getStrategy(order: ReadingOrder): ReadingOrderStrategy {
    return this.strategies[order];
  }
}
