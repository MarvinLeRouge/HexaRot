import { Module } from '@nestjs/common';
import { ReadingOrderModule } from '../reading-order/reading-order.module';
import { RotationEngine } from './rotation-engine';

@Module({
  imports: [ReadingOrderModule],
  providers: [RotationEngine],
  exports: [RotationEngine],
})
export class RotationModule {}
