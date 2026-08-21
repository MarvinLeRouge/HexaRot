import { IsString, IsNotEmpty } from 'class-validator';

/** Request body for POST /key/parse. */
export class KeyParseRequestDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}
