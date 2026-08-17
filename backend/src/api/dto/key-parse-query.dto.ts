import { IsString, IsNotEmpty } from 'class-validator';

/** Query params for GET /key/parse. */
export class KeyParseQueryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}
