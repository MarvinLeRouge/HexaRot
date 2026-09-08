import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyEmailDto } from './verify-email.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(VerifyEmailDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('VerifyEmailDto', () => {
  it('passes with a non-empty token string', async () => {
    const errors = await validateBody({ token: 'abc123' });
    expect(errors).toHaveLength(0);
  });

  it('fails when token is missing', async () => {
    const errors = await validateBody({});
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('fails when token is an empty string', async () => {
    const errors = await validateBody({ token: '' });
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });
});
