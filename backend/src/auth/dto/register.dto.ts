import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;

/** Request body for POST /auth/register. */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      'password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
  })
  password!: string;
}
