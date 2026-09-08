import { IsEmail } from 'class-validator';

/** Request body for POST /auth/resend-verification. */
export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}
