import { Injectable, BadRequestException } from '@nestjs/common';
import { KeyCodec, KeyParams } from '../key/key-codec';
import { HexahueAlphabet } from '../alphabet/hexahue-alphabet.service';
import { RotationEngine } from '../rotation/rotation-engine';
import { getCasePixels } from '../renderer/palette';
import { parsePng } from '../renderer/png-parser';
import { parseSvg } from '../renderer/svg-parser';
import { decodeGrid } from '../cipher/decode-grid';
import { ColorGrid } from '../shared/types';
import { DecodeRequestDto } from './dto/decode-request.dto';

/** Response shape for POST /decode. */
export interface DecodeResult {
  message: string;
}

@Injectable()
export class DecodeService {
  constructor(
    private readonly alphabet: HexahueAlphabet,
    private readonly rotationEngine: RotationEngine,
  ) {}

  async decode(dto: DecodeRequestDto): Promise<DecodeResult> {
    let keyParams: KeyParams;
    try {
      keyParams = KeyCodec.decode(dto.key);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const casePixels = getCasePixels(dto.size);

    let grid: ColorGrid;
    try {
      grid =
        dto.format === 'png'
          ? await parsePng(Buffer.from(dto.cryptogram, 'base64'), casePixels)
          : parseSvg(dto.cryptogram, casePixels);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const gridHeightInCases = grid.length;
    const gridWidthInCases = gridHeightInCases > 0 ? grid[0].length : 0;
    if (
      gridWidthInCases % keyParams.pivotBlockSize !== 0 ||
      gridHeightInCases % keyParams.pivotBlockSize !== 0
    ) {
      throw new BadRequestException(
        `Grid dimensions ${gridWidthInCases}x${gridHeightInCases} are not consistent with pivotBlockSize=${keyParams.pivotBlockSize} from the given key`,
      );
    }

    const unrotated = this.rotationEngine.decode(
      grid,
      keyParams.pivotBlockSize,
      keyParams.rotationSequence,
      keyParams.rotationDirection,
      keyParams.readingOrder,
    );

    const message = decodeGrid(unrotated, this.alphabet);
    return { message };
  }
}
