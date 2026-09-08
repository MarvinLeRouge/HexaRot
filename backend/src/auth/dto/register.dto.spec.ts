import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('RegisterDto', () => {
  it('passes with a valid email and a 12+ character password', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'correct-horse-battery-staple',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateBody({
      email: 'not-an-email',
      password: 'correct-horse-battery-staple',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('fails when password is shorter than 12 characters', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'short',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when extra fields are present (strict DTO)', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'correct-horse-battery-staple',
      role: 'ADMIN',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
