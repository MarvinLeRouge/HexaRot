import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/** Request body for POST /decode. */
export class DecodeRequestDto {
  @IsString()
  @IsNotEmpty()
  cryptogram!: string;

  @IsIn(['png', 'svg'])
  format!: 'png' | 'svg';

  @IsString()
  @IsNotEmpty()
  key!: string;

  /**
   * Ignored: the key embeds its own size (FEAT-022) and the image is always
   * parsed at that size. Still accepted, with any value, so clients that
   * send it keep working instead of failing on a field with no effect.
   */
  @IsOptional()
  size?: unknown;
}
