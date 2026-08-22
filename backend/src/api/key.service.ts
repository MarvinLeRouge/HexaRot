import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';

const DEFAULT_PIVOT_BLOCK_SIZE = 5;
const DEFAULT_ROTATION_SEQUENCE: RotationSequence = Object.freeze([
  0, 1, 2, 3,
]) as unknown as RotationSequence;
const DEFAULT_ROTATION_DIRECTION: 'cw' | 'ccw' = 'cw';
const DEFAULT_READING_ORDER: KeyParams['readingOrder'] = 'LR-TB';
const DEFAULT_SIZE: KeyParams['size'] = 'medium';

/** Response shape for POST /key/parse. */
export interface KeyParseResult {
  pivotBlockSize: number;
  /**
   * Rotation angles in degrees (e.g. [0, 90, 180, 270]), NOT permutation
   * indices - contrast with POST /key/generate's request field of the same
   * name, which takes indices (0-3).
   */
  rotationSequence: number[];
  rotationDirection: 'cw' | 'ccw';
  readingOrder: KeyParams['readingOrder'];
  size: KeyParams['size'];
}

@Injectable()
export class KeyService {
  generate(dto: KeyGenerateRequestDto): { key: string } {
    const keyParams: KeyParams = {
      version: 1,
      pivotBlockSize: dto.pivotBlockSize ?? DEFAULT_PIVOT_BLOCK_SIZE,
      rotationSequence:
        (dto.rotationSequence as RotationSequence) ?? DEFAULT_ROTATION_SEQUENCE,
      rotationDirection: dto.rotationDirection ?? DEFAULT_ROTATION_DIRECTION,
      readingOrder:
        (dto.readingOrder as KeyParams['readingOrder']) ??
        DEFAULT_READING_ORDER,
      size: dto.size ?? DEFAULT_SIZE,
    };

    try {
      return { key: KeyCodec.encode(keyParams) };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  parse(key: string): KeyParseResult {
    let keyParams: KeyParams;
    try {
      keyParams = KeyCodec.decode(key);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    return {
      pivotBlockSize: keyParams.pivotBlockSize,
      rotationSequence: keyParams.rotationSequence.map((index) => index * 90),
      rotationDirection: keyParams.rotationDirection,
      readingOrder: keyParams.readingOrder,
      size: keyParams.size,
    };
  }
}
