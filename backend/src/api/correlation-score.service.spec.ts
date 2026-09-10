// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { CorrelationScoreService } from './correlation-score.service';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { KeyCodec } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

function makeService(): CorrelationScoreService {
  const alphabet = new MockAlphabet();
  return new CorrelationScoreService(
    alphabet as unknown as HexahueAlphabet,
    new RotationEngine(new ReadingOrderRegistry()),
  );
}

const VALID_PARAMS_DTO: CorrelationScoreRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

describe('CorrelationScoreService', () => {
  describe('happy path', () => {
    it('returns a score in [0, 1] for a valid params body', () => {
      const service = makeService();
      const result = service.compute(VALID_PARAMS_DTO);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('returns a score in [0, 1] for a valid key body', () => {
      const service = makeService();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
        size: 'medium',
      });
      const dto = { message: 'ABC', key } as CorrelationScoreRequestDto;

      const result = service.compute(dto);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('determinism', () => {
    it('returns the exact same score across repeated calls with the same input', () => {
      const service = makeService();
      const first = service.compute(VALID_PARAMS_DTO);
      const second = service.compute(VALID_PARAMS_DTO);
      const third = service.compute(VALID_PARAMS_DTO);

      expect(second.score).toBe(first.score);
      expect(third.score).toBe(first.score);
    });
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', () => {
      const service = makeService();
      const dto = {
        message: 'ABC',
        key: 'not-a-key',
      } as CorrelationScoreRequestDto;

      expect(() => service.compute(dto)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when key unpacks to pivotBlockSize=0', () => {
      const service = makeService();
      const dto = {
        message: 'ABC',
        key: 'HR1·0000',
      } as CorrelationScoreRequestDto;

      expect(() => service.compute(dto)).toThrow(BadRequestException);
    });
  });
});
