import { IsString, IsNotEmpty, IsIn } from 'class-validator';

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

  @IsIn(['small', 'medium', 'large'])
  size!: 'small' | 'medium' | 'large';
}
