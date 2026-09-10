import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { READING_ORDERS } from '../../key/key-codec';
import { MAX_MESSAGE_LENGTH } from '../../cipher/header';

/**
 * Request body for POST /correlation-score. Same "either key, or all four
 * individual params" contract as EncodeRequestDto, minus the two
 * rendering-only fields (size, overrideWeaknessWarning) that don't apply
 * here since this endpoint never renders an image.
 */
export class CorrelationScoreRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsIn(READING_ORDERS)
  readingOrder?: string;
}
