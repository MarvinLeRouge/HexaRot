import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { DecodeService } from './decode.service';
import type { DecodeResult } from './decode.service';
import { DecodeRequestDto } from './dto/decode-request.dto';

/**
 * Decodes a HexaRot cryptogram (PNG or SVG) back into text, given the key
 * it was encoded with. Inverts the full pipeline: parse image, undo
 * rotation, reverse-map symbols to characters. Returns the full decoded
 * grid content with no automatic message/padding boundary detection - see
 * docs/superpowers/specs/2026-08-17-decode-api-endpoint-design.md.
 */
@Controller('decode')
export class DecodeController {
  constructor(private readonly decodeService: DecodeService) {}

  /**
   * @param dto - cryptogram, format, key, and case size.
   * @returns The decoded message (may include trailing padding-derived content).
   */
  @Post()
  @HttpCode(200)
  async decode(@Body() dto: DecodeRequestDto): Promise<DecodeResult> {
    return this.decodeService.decode(dto);
  }
}
