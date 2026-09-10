import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { CorrelationScoreService } from './correlation-score.service';
import type { CorrelationScoreResult } from './correlation-score.service';
import { CorrelationScoreRequestDto } from './dto/correlation-score-request.dto';

/**
 * Handles POST /correlation-score - computes how much of a cryptogram's
 * original grid structure remains detectable after rotation.
 */
@Controller('correlation-score')
export class CorrelationScoreController {
  constructor(
    private readonly correlationScoreService: CorrelationScoreService,
  ) {}

  /**
   * Computes the correlation score for the given message and parameters.
   *
   * @param dto - Validated request body.
   * @returns The correlation score result (score).
   */
  @Post()
  @HttpCode(200)
  compute(@Body() dto: CorrelationScoreRequestDto): CorrelationScoreResult {
    return this.correlationScoreService.compute(dto);
  }
}
