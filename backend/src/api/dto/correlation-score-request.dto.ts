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
import {
  MAX_KEY_INPUT_LENGTH,
  MAX_ROTATION_SEQUENCE_LENGTH,
  MIN_ROTATION_SEQUENCE_LENGTH,
  READING_ORDERS,
} from '../../key/key-codec';
import { MAX_ENCODE_MESSAGE_LENGTH } from '../../cipher/max-message-length';

/**
 * Request body for POST /correlation-score. Same "either key, or all four
 * individual params" contract as EncodeRequestDto, minus the two
 * rendering-only fields (size, overrideWeaknessWarning) that don't apply
 * here since this endpoint never renders an image.
 */
export class CorrelationScoreRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ENCODE_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_KEY_INPUT_LENGTH)
  key?: string;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  @ValidateIf((o: CorrelationScoreRequestDto) => !o.key)
  @IsArray()
  @ArrayMinSize(MIN_ROTATION_SEQUENCE_LENGTH)
  @ArrayMaxSize(MAX_ROTATION_SEQUENCE_LENGTH)
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
