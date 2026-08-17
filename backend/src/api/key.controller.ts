import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common';
import { KeyService, KeyParseResult } from './key.service';
import { KeyGenerateRequestDto } from './dto/key-generate-request.dto';
import { KeyParseQueryDto } from './dto/key-parse-query.dto';

@Controller('key')
export class KeyController {
  constructor(private readonly keyService: KeyService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@Body() dto: KeyGenerateRequestDto): { key: string } {
    return this.keyService.generate(dto);
  }

  @Get('parse')
  parse(@Query() query: KeyParseQueryDto): KeyParseResult {
    return this.keyService.parse(query.key);
  }
}
