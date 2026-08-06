import { Test, TestingModule } from '@nestjs/testing';
import { ReadingOrderModule } from './reading-order.module';
import { ReadingOrderRegistry } from './reading-order.registry';

describe('ReadingOrderModule', () => {
  it('exposes ReadingOrderRegistry to importing modules', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ReadingOrderModule],
    }).compile();

    expect(moduleRef.get(ReadingOrderRegistry)).toBeInstanceOf(
      ReadingOrderRegistry,
    );
  });
});
