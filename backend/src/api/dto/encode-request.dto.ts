import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { READING_ORDERS } from '../../key/key-codec';

/**
 * Request body for POST /encode. Either `key` is provided (individual
 * params below are ignored), or all four individual params are provided
 * (there is no "sensible defaults" fallback for this endpoint - that is
 * POST /key/generate's job). `size` is also ignored when `key` is provided:
 * the key embeds its own size (FEAT-022), and honouring a request-supplied
 * size that differs from it would let the rendered cryptogram silently
 * stop matching what the key says it is.
 */
export class EncodeRequestDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @ValidateIf((o: EncodeRequestDto) => !o.key)
  @IsIn(READING_ORDERS)
  readingOrder?: string;

  @IsOptional()
  @IsIn(['small', 'medium', 'large'])
  size?: 'small' | 'medium' | 'large';

  @IsOptional()
  @IsBoolean()
  overrideWeaknessWarning?: boolean;
}
