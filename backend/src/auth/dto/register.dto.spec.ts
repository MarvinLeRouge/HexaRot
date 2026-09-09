import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('RegisterDto', () => {
  it('passes with a valid email and a password meeting every complexity rule', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery9',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateBody({
      email: 'not-an-email',
      password: 'Correct-Horse-Battery9',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('fails when password is shorter than 12 characters', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Sh0rt-a!',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no uppercase letter', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'correct-horse-battery9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no lowercase letter', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'CORRECT-HORSE-BATTERY9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no digit', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when password has no special character', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'CorrectHorseBattery9',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when extra fields are present (strict DTO)', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'Correct-Horse-Battery9',
      role: 'ADMIN',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
