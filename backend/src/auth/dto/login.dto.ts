import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/** Request body for POST /auth/login. No length rule here on purpose: an
 * existing account may have been created before a password policy change. */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
