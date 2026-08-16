import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { EncodeService, EncodeResult } from './encode.service';
import { EncodeRequestDto } from './dto/encode-request.dto';

/** Handles POST /encode - encodes a message into a Hexahue rotation cryptogram. */
@Controller('encode')
export class EncodeController {
  constructor(private readonly encodeService: EncodeService) {}

  /**
   * Encodes the given message and parameters into PNG/SVG cryptograms.
   *
   * @param dto - Validated request body.
   * @returns The encoding result (png, svg, key, warnings, unknownChars).
   */
  @Post()
  @HttpCode(200)
  async encode(@Body() dto: EncodeRequestDto): Promise<EncodeResult> {
    return this.encodeService.encode(dto);
  }
}
