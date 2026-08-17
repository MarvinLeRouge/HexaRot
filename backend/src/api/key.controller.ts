import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common';
import { KeyService } from './key.service';
import type { KeyParseResult } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyParseQueryDto } from './dto/key-parse-query.dto';

/** Handles POST /key/generate and GET /key/parse - key generation and parsing, no cipher/rendering pipeline involvement. */
@Controller('key')
export class KeyController {
  constructor(private readonly keyService: KeyService) {}

  /**
   * Generates a key string from the given (optionally partial) parameters.
   *
   * @param dto - Validated request body; missing fields fall back to their defaults.
   * @returns The generated key string.
   */
  @Post('generate')
  @HttpCode(200)
  generate(@Body() dto: KeyGenerateRequestDto): { key: string } {
    return this.keyService.generate(dto);
  }

  /**
   * Parses a key string into its constituent parameters.
   *
   * @param query - Validated query parameters containing the key string.
   * @returns The decoded key parameters.
   */
  @Get('parse')
  parse(@Query() query: KeyParseQueryDto): KeyParseResult {
    return this.keyService.parse(query.key);
  }
}
