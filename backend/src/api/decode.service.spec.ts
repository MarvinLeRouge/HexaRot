// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { DecodeService } from './decode.service';
import { EncodeService } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';
import { DecodeRequestDto } from './dto/decode-request.dto';
import { RotationEngine } from '../rotation/rotation-engine';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { MockAlphabet } from '../../test/utils/mock-alphabet';
import { KeyCodec } from '../key/key-codec';

function makeServices() {
  const alphabet = new MockAlphabet();
  const rotationEngine = new RotationEngine(new ReadingOrderRegistry());
  const encodeService = new EncodeService(
    alphabet as unknown as HexahueAlphabet,
    rotationEngine,
    new PngRenderer(),
    new SvgRenderer(),
  );
  const decodeService = new DecodeService(
    alphabet as unknown as HexahueAlphabet,
    rotationEngine,
  );
  return { encodeService, decodeService };
}

const BASE_ENCODE_DTO: EncodeRequestDto = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
  size: 'medium',
} as EncodeRequestDto;

describe('DecodeService', () => {
  describe('round-trip', () => {
    it('decodes a PNG cryptogram produced by encoding and recovers the original message as a prefix', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);

      const decodeDto: DecodeRequestDto = {
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'medium',
      } as DecodeRequestDto;

      const result = await decodeService.decode(decodeDto);
      expect(result.message.startsWith('ABC')).toBe(true);
    });

    it('decodes an SVG cryptogram produced by encoding and recovers the original message as a prefix', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);

      const decodeDto: DecodeRequestDto = {
        cryptogram: encoded.svg,
        format: 'svg',
        key: encoded.key,
        size: 'medium',
      } as DecodeRequestDto;

      const result = await decodeService.decode(decodeDto);
      expect(result.message.startsWith('ABC')).toBe(true);
    });

    it.each(['LR-TB', 'RL-TB', 'TB-LR', 'BT-LR'] as const)(
      'recovers the message for reading order %s',
      async (readingOrder) => {
        const { encodeService, decodeService } = makeServices();
        const encoded = await encodeService.encode({
          ...BASE_ENCODE_DTO,
          readingOrder,
        });
        const result = await decodeService.decode({
          cryptogram: encoded.png,
          format: 'png',
          key: encoded.key,
          size: 'medium',
        } as DecodeRequestDto);
        expect(result.message.startsWith('ABC')).toBe(true);
      },
    );

    it.each(['cw', 'ccw'] as const)(
      'recovers the message for rotation direction %s',
      async (rotationDirection) => {
        const { encodeService, decodeService } = makeServices();
        const encoded = await encodeService.encode({
          ...BASE_ENCODE_DTO,
          rotationDirection,
        });
        const result = await decodeService.decode({
          cryptogram: encoded.png,
          format: 'png',
          key: encoded.key,
          size: 'medium',
        } as DecodeRequestDto);
        expect(result.message.startsWith('ABC')).toBe(true);
      },
    );
  });

  describe('errors', () => {
    it('throws BadRequestException when key is malformed', async () => {
      const { decodeService } = makeServices();
      const dto = {
        cryptogram: 'irrelevant',
        format: 'png',
        key: 'not-a-key',
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the PNG cryptogram is not a valid image', async () => {
      const { decodeService } = makeServices();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: Buffer.from('not a png', 'utf-8').toString('base64'),
        format: 'png',
        key,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the SVG cryptogram is not valid SVG', async () => {
      const { decodeService } = makeServices();
      const key = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 5,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: 'not svg at all',
        format: 'svg',
        key,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when grid dimensions are inconsistent with the key pivotBlockSize', async () => {
      const { encodeService, decodeService } = makeServices();
      const encoded = await encodeService.encode(BASE_ENCODE_DTO);
      const mismatchedKey = KeyCodec.encode({
        version: 1,
        pivotBlockSize: 7,
        rotationSequence: [0, 1, 2, 3],
        rotationDirection: 'cw',
        readingOrder: 'LR-TB',
      });
      const dto = {
        cryptogram: encoded.png,
        format: 'png',
        key: mismatchedKey,
        size: 'medium',
      } as DecodeRequestDto;
      await expect(decodeService.decode(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
