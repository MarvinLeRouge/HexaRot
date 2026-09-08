import { IsString, IsNotEmpty } from 'class-validator';

/** Request body for POST /auth/verify-email. Token only, in the body - never a GET query param. */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
