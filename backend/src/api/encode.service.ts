import { Injectable, BadRequestException } from '@nestjs/common';
import { preprocess } from '../cipher/preprocess';
import { buildGrid } from '../cipher/build-grid';
import { validateParams } from '../validation/validate-params';
import { RotationEngine } from '../rotation/rotation-engine';
import { PngRenderer } from '../renderer/png-renderer';
import { SvgRenderer } from '../renderer/svg-renderer';
import { KeyCodec, KeyParams, RotationSequence } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { EncodeRequestDto } from './dto/encode-request.dto';

/** Response shape for POST /encode. */
export interface EncodeResult {
  png: string;
  svg: string;
  key: string;
  warnings: string[];
  unknownChars: string[];
}

@Injectable()
export class EncodeService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
    private readonly pngRenderer: PngRenderer,
    private readonly svgRenderer: SvgRenderer,
  ) {}

  async encode(dto: EncodeRequestDto): Promise<EncodeResult> {
    let keyParams: KeyParams;
    let key: string;

    if (dto.key) {
      try {
        keyParams = KeyCodec.decode(dto.key);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
      key = dto.key;
    } else {
      keyParams = {
        version: 1,
        pivotBlockSize: dto.pivotBlockSize as number,
        rotationSequence: dto.rotationSequence as RotationSequence,
        rotationDirection: dto.rotationDirection as 'cw' | 'ccw',
        readingOrder: dto.readingOrder as KeyParams['readingOrder'],
        size: dto.size ?? 'medium',
      };
      try {
        key = KeyCodec.encode(keyParams);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    const validation = validateParams(
      keyParams.pivotBlockSize,
      this.alphabet,
      dto.overrideWeaknessWarning ?? false,
    );
    const warnings = validation.status === 'weak' ? validation.warnings : [];

    const { text, unknownChars } = preprocess(dto.message, this.alphabet);
    const bodyGrid = buildGrid(text, this.alphabet, keyParams.pivotBlockSize);
    const rotatedGrid = this.rotationEngine.encode(
      bodyGrid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    // Always render at the key's own size - keyParams.size is either the
    // caller's requested size (params mode, embedded into the new key) or
    // whatever the provided key already encodes (key mode). This keeps the
    // key authoritative: it never describes a cryptogram rendered at a
    // different size than what it says.
    const pngBuffer = await this.pngRenderer.render(
      rotatedGrid,
      keyParams.size,
    );
    const svgString = this.svgRenderer.render(rotatedGrid, keyParams.size);

    return {
      png: pngBuffer.toString('base64'),
      svg: svgString,
      key,
      warnings,
      unknownChars,
    };
  }
}
