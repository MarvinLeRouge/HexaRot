import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { MAX_KEY_INPUT_LENGTH } from '../../key/key-codec';

/** Request body for POST /key/parse. */
export class KeyParseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_KEY_INPUT_LENGTH)
  key!: string;
}
