import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResendVerificationDto } from './resend-verification.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(ResendVerificationDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('ResendVerificationDto', () => {
  it('passes with a valid email', async () => {
    const errors = await validateBody({ email: 'user@example.com' });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateBody({ email: 'not-an-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
