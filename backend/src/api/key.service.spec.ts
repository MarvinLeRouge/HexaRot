// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyCodec } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';

describe('KeyService', () => {
  // Only the symbol shape matters to KeyService
  const service = new KeyService({
    symbolWidth: 2,
    symbolHeight: 3,
  } as HexahueAlphabet);

  describe('generate', () => {
    it('throws BadRequestException when the pivot block size can never fit the size', () => {
      expect(() =>
        service.generate({ pivotBlockSize: 181, size: 'large' }),
      ).toThrow(/cannot be used/);
    });

    it('accepts a large pivot block size at a size it fits', () => {
      expect(() =>
        service.generate({ pivotBlockSize: 181, size: 'medium' }),
      ).not.toThrow();
    });

    it('returns a valid HR key string for a fully specified parameter set', () => {
      const dto: KeyGenerateRequestDto = {
        pivotBlockSize: 7,
        rotationSequence: [3, 2, 1, 0],
        rotationDirection: 'ccw',
        readingOrder: 'RL-TB',
      };
      const result = service.generate(dto);
      expect(result.key).toMatch(/^HR2·[0-9A-Z]{6}$/);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(7);
      // ccw is folded into the angles: [3,2,1,0] ccw is [1,2,3,0] cw.
      expect(decoded.rotationSequence).toEqual([1, 2, 3, 0]);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.readingOrder).toBe('RL-TB');
    });

    it('returns a valid HR key string with default parameters when no body is provided', () => {
      const result = service.generate({});
      expect(result.key).toMatch(/^HR2·[0-9A-Z]{6}$/);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(5);
      expect(decoded.rotationSequence).toEqual([0, 1, 2, 3]);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.readingOrder).toBe('LR-TB');
    });

    it.each([
      'LR-TB',
      'RL-TB',
      'TB-LR',
      'BT-LR',
      'LR-TB-ALT',
      'RL-TB-ALT',
      'TB-LR-ALT',
      'BT-LR-ALT',
    ])('returns a valid HR key string for reading order %s', (readingOrder) => {
      const result = service.generate({
        readingOrder,
      });
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.readingOrder).toBe(readingOrder);
    });

    it('folds a ccw direction into the angles of a cw key', () => {
      const result = service.generate({
        rotationSequence: [1, 2, 3, 0],
        rotationDirection: 'ccw',
      });
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.rotationDirection).toBe('cw');
      expect(decoded.rotationSequence).toEqual([3, 2, 1, 0]);
    });

    it('returns a key for a 32-angle sequence with repeated angles', () => {
      const rotationSequence = Array.from({ length: 32 }, (_, i) => i % 3);
      const result = service.generate({ rotationSequence });
      expect(KeyCodec.decode(result.key).rotationSequence).toEqual(
        rotationSequence,
      );
    });

    it('throws BadRequestException when the rotationSequence is only 0° rotations', () => {
      const dto = { rotationSequence: [0, 0, 0, 0] } as KeyGenerateRequestDto;
      expect(() => service.generate(dto)).toThrow(BadRequestException);
    });

    it('defaults to size "medium" when no body is provided', () => {
      const result = service.generate({});
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.size).toBe('medium');
    });

    it.each(['small', 'medium', 'large'] as const)(
      'embeds the requested size %s into the generated key',
      (size) => {
        const result = service.generate({ size });
        const decoded = KeyCodec.decode(result.key);
        expect(decoded.size).toBe(size);
      },
    );
  });

  describe('parse', () => {
    it('returns all decoded params for a valid HR key', () => {
      const key = KeyCodec.encode({
        version: 2,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
        size: 'large',
      });
      const result = service.parse(key);
      expect(result.pivotBlockSize).toBe(5);
      expect(result.rotationSequence).toEqual([0, 90, 180, 270]);
      expect(result.rotationDirection).toBe('cw');
      expect(result.readingOrder).toBe('LR-TB');
      expect(result.size).toBe('large');
    });

    it('returns the correct rotationSequence as an array of angles for a non-identity sequence', () => {
      const key = KeyCodec.encode({
        version: 2,
        pivotBlockSize: 5,
        rotationSequence: [3, 1, 0, 2],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
        size: 'medium',
      });
      const result = service.parse(key);
      expect(result.rotationSequence).toEqual([270, 90, 0, 180]);
    });

    it('returns the angles and direction of a V1 key handed out before V2', () => {
      // V1 payload: pivotBlockSize=5, LR-TB, ccw, permutation 23 ([3,2,1,0]), medium.
      const payload = 5 | (1 << 11) | (23 << 12) | (1 << 17);
      const result = service.parse(`HR1·${payload.toString(36).toUpperCase()}`);
      expect(result.rotationSequence).toEqual([270, 180, 90, 0]);
      expect(result.rotationDirection).toBe('ccw');
    });

    it('throws BadRequestException for a malformed key string', () => {
      expect(() => service.parse('not-a-key')).toThrow(BadRequestException);
    });
  });
});
