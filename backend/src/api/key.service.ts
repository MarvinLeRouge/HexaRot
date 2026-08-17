import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';

const DEFAULT_PIVOT_BLOCK_SIZE = 5;
const DEFAULT_ROTATION_SEQUENCE: RotationSequence = [0, 1, 2, 3];
const DEFAULT_ROTATION_DIRECTION: 'cw' | 'ccw' = 'cw';
const DEFAULT_READING_ORDER: KeyParams['readingOrder'] = 'LR-TB';

/** Response shape for GET /key/parse. */
export interface KeyParseResult {
  pivotBlockSize: number;
  rotationSequence: number[];
  rotationDirection: 'cw' | 'ccw';
  readingOrder: string;
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
    };
  }
}
