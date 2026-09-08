import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(LoginDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('LoginDto', () => {
  it('passes with a valid email and any non-empty password', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: 'x',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateBody({
      email: 'not-an-email',
      password: 'x',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('fails when password is empty', async () => {
    const errors = await validateBody({
      email: 'user@example.com',
      password: '',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
