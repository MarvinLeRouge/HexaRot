import { Injectable, BadRequestException } from '@nestjs/common';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { RotationEngine } from '../rotation/rotation-engine';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { computeCorrelationScore } from '../correlation/correlation-score';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';

/** Response shape for POST /correlation-score. */
export interface CorrelationScoreResult {
  score: number;
}

/** Derives a 32-bit integer seed from a string via a simple string hash. */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Mulberry32: a small, fast seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable()
export class CorrelationScoreService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
  ) {}

  compute(dto: CorrelationScoreRequestDto): CorrelationScoreResult {
    let keyParams: KeyParams;

    if (dto.key) {
      try {
        keyParams = KeyCodec.decode(dto.key);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    } else {
      keyParams = {
        version: 1,
        pivotBlockSize: dto.pivotBlockSize as number,
        rotationSequence: dto.rotationSequence as RotationSequence,
        rotationDirection: dto.rotationDirection as 'cw' | 'ccw',
        readingOrder: dto.readingOrder as KeyParams['readingOrder'],
        size: 'medium',
      };
    }

    const { text } = preprocess(dto.message, this.alphabet);
    // Seed buildGrid's padding RNG from the request itself so repeated calls
    // with identical input produce an identical grid, and therefore an
    // identical score (determinism is a hard requirement for this endpoint).
    const randomFn = mulberry32(
      hashSeed(`${text}:${keyParams.pivotBlockSize}`),
    );
    const bodyGrid = buildGrid(
      text,
      this.alphabet,
      keyParams.pivotBlockSize,
      randomFn,
    );
    const rotatedGrid = this.rotationEngine.encode(
      bodyGrid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    const score = computeCorrelationScore(bodyGrid, rotatedGrid);
    return { score };
  }
}
