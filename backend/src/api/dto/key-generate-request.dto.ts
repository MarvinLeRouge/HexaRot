import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { READING_ORDERS } from '../../key/key-codec';

/**
 * Request body for POST /key/generate. Every field is independently
 * optional - any field left out gets its own fixed default, applied in
 * KeyService.generate(). Unlike POST /encode's DTO, there is no key/params
 * branching here - this endpoint's whole job is producing a key.
 */
export class KeyGenerateRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  pivotBlockSize?: number;

  /**
   * Permutation indices (0-3), NOT angles - each index maps to
   * [0, 90, 180, 270] degrees respectively. Contrast with POST /key/parse's
   * response, which returns this same concept as literal angle values.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  rotationSequence?: number[];

  @IsOptional()
  @IsIn(['cw', 'ccw'])
  rotationDirection?: 'cw' | 'ccw';

  @IsOptional()
  @IsIn(READING_ORDERS)
  readingOrder?: string;
}
