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

const READING_ORDERS = [
  'LR-TB',
  'RL-TB',
  'TB-LR',
  'BT-LR',
  'LR-TB-ALT',
  'RL-TB-ALT',
  'TB-LR-ALT',
  'BT-LR-ALT',
];

/**
 * Request body for POST /encode. Either `key` is provided (individual
 * params below are ignored), or all four individual params are provided
 * (there is no "sensible defaults" fallback for this endpoint - that is
 * POST /key/generate's job, not implemented yet).
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
