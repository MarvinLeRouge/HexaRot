import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { KeyService } from './key.service';
import type { KeyParseResult } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyParseRequestDto } from './dto/key-parse-request.dto';

/** Handles POST /key/generate and POST /key/parse - key generation and parsing, no cipher/rendering pipeline involvement. */
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
   * POST rather than GET: the key is a decryption secret, and a GET query
   * string is written by default into server access logs, reverse-proxy
   * logs, and browser history/cache - a durable, shared leak channel a
   * secret must not travel through.
   *
   * @param dto - Validated request body containing the key string.
   * @returns The decoded key parameters.
   */
  @Post('parse')
  @HttpCode(200)
  parse(@Body() dto: KeyParseRequestDto): KeyParseResult {
    return this.keyService.parse(dto.key);
  }
}
