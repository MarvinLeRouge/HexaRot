import { Module } from '@nestjs/common';
import { ReadingOrderRegistry } from './reading-order.registry';

@Module({
  providers: [ReadingOrderRegistry],
  exports: [ReadingOrderRegistry],
})
export class ReadingOrderModule {}
