import { Test, TestingModule } from '@nestjs/testing';
import { RotationModule } from './rotation.module';
import { RotationEngine } from './rotation-engine';

describe('RotationModule', () => {
  it('exposes RotationEngine, with ReadingOrderRegistry injected, to importing modules', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RotationModule],
    }).compile();

    expect(moduleRef.get(RotationEngine)).toBeInstanceOf(RotationEngine);
  });
});
