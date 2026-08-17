import { BadRequestException } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyCodec } from '../key/key-codec';

describe('KeyService', () => {
  const service = new KeyService();

  describe('generate', () => {
    it('returns a valid HR key string for a fully specified parameter set', () => {
      const dto: KeyGenerateRequestDto = {
        pivotBlockSize: 7,
        rotationSequence: [3, 2, 1, 0],
        rotationDirection: 'ccw',
        readingOrder: 'RL-TB',
      };
      const result = service.generate(dto);
      expect(result.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.pivotBlockSize).toBe(7);
      expect(decoded.rotationSequence).toEqual([3, 2, 1, 0]);
      expect(decoded.rotationDirection).toBe('ccw');
      expect(decoded.readingOrder).toBe('RL-TB');
    });

    it('returns a valid HR key string with default parameters when no body is provided', () => {
      const result = service.generate({} as KeyGenerateRequestDto);
      expect(result.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
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
      } as KeyGenerateRequestDto);
      const decoded = KeyCodec.decode(result.key);
      expect(decoded.readingOrder).toBe(readingOrder);
    });

    it.each(['cw', 'ccw'] as const)(
      'returns a valid HR key string for rotation direction %s',
      (rotationDirection) => {
        const result = service.generate({
          rotationDirection,
        } as KeyGenerateRequestDto);
        const decoded = KeyCodec.decode(result.key);
        expect(decoded.rotationDirection).toBe(rotationDirection);
      },
    );

    it('throws BadRequestException when the provided rotationSequence is not a valid permutation', () => {
      const dto = { rotationSequence: [0, 0, 1, 2] } as KeyGenerateRequestDto;
      expect(() => service.generate(dto)).toThrow(BadRequestException);
    });
  });

  describe('parse', () => {
    it('returns all decoded params for a valid HR key', () => {
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const result = service.parse(key);
      expect(result.pivotBlockSize).toBe(5);
      expect(result.rotationSequence).toEqual([0, 90, 180, 270]);
      expect(result.rotationDirection).toBe('cw');
      expect(result.readingOrder).toBe('LR-TB');
    });

    it('returns the correct rotationSequence as an array of angles for a non-identity sequence', () => {
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [3, 1, 0, 2],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const result = service.parse(key);
      expect(result.rotationSequence).toEqual([270, 90, 0, 180]);
    });

    it('throws BadRequestException for a malformed key string', () => {
      expect(() => service.parse('not-a-key')).toThrow(BadRequestException);
    });
  });
});
