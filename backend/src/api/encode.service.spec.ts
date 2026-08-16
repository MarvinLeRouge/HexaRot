// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { EncodeService } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { KeyCodec } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';

function makeService(): EncodeService {
  const alphabet = new MockAlphabet();
  return new EncodeService(
    alphabet as unknown as HexahueAlphabet,
    new RotationEngine(new ReadingOrderRegistry()),
    new PngRenderer(),
    new SvgRenderer(),
  );
}

const VALID_PARAMS_DTO: EncodeRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
} as EncodeRequestDto;

describe('EncodeService', () => {
  describe('happy path', () => {
    it('returns a base64 png, an svg string, a key, empty warnings, and empty unknownChars for a clean message', async () => {
      const service = makeService();
      const result = await service.encode(VALID_PARAMS_DTO);

      expect(typeof result.png).toBe('string');
      expect(Buffer.from(result.png, 'base64').subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
      expect(result.svg.startsWith('<svg')).toBe(true);
      expect(typeof result.key).toBe('string');
      expect(result.warnings).toEqual([]);
      expect(result.unknownChars).toEqual([]);
    });

    it('generates a key from individual params when no key field is provided', async () => {
      const service = makeService();
      const result = await service.encode(VALID_PARAMS_DTO);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(5);
      expect(decoded.rotationSequence).toEqual([0, 1, 2, 3]);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.readingOrder).toBe('LR-TB');
    });

    it('uses the provided key and ignores individual params when key is present', async () => {
      const service = makeService();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 7,
        rotationSequence: [3, 2, 1, 0],
        rotationDirection: 'ccw',
        readingOrder: 'RL-TB',
      });
      const dto = { message: 'ABC', key } as EncodeRequestDto;

      const result = await service.encode(dto);
      expect(result.key).toBe(key);
    });

    it.each(['small', 'medium', 'large'] as const)(
      'encodes the message with size %s without error',
      async (size) => {
        const service = makeService();
        const result = await service.encode({ ...VALID_PARAMS_DTO, size });
        expect(result.png.length).toBeGreaterThan(0);
      },
    );
  });

  describe('weakness warning', () => {
    it('returns a non-empty warnings array when pivotBlockSize is weak', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        pivotBlockSize: 3,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('does not block encoding when a weakness warning is present', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        pivotBlockSize: 3,
      });
      expect(result.png.length).toBeGreaterThan(0);
    });

    it('returns an empty warnings array when overrideWeaknessWarning is true and pivotBlockSize is weak', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        pivotBlockSize: 3,
        overrideWeaknessWarning: true,
      });
      expect(result.warnings).toEqual([]);
    });
  });

  describe('unknown characters', () => {
    it('lists the unknown character for a message containing an unsupported symbol', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        message: 'ABXYZ',
      });
      expect(result.unknownChars).toEqual(
        expect.arrayContaining(['X', 'Y', 'Z']),
      );
    });

    it('encodes the remaining supported characters when unknown chars are present', async () => {
      const service = makeService();
      const result = await service.encode({
        ...VALID_PARAMS_DTO,
        message: 'ABXYZ',
      });
      expect(result.png.length).toBeGreaterThan(0);
    });
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', async () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'not-a-key' } as EncodeRequestDto;
      await expect(service.encode(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when key unpacks to an out-of-range rotation sequence index', async () => {
      const service = makeService();
      const dto = { message: 'ABC', key: 'HR1·ZZZZ' } as EncodeRequestDto;
      await expect(service.encode(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
