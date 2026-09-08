import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

/** Request body for POST /auth/register. */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}
