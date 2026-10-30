import { readFileSync } from 'fs';
import { join } from 'path';
import { compare, hash } from 'bcryptjs';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  SEED_ADMIN_PASSWORD_PLACEHOLDERS,
  seedAdminUser,
} from '../../prisma/seed-admin';

const VALID_PASSWORD = 'A-real-admin-password-42';

function makeClientMock() {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

function asClient(mock: ReturnType<typeof makeClientMock>): PrismaClient {
  return mock as unknown as PrismaClient;
}

describe('seedAdminUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SEED_ADMIN_EMAIL: 'admin@hexarot.local',
      SEED_ADMIN_PASSWORD: VALID_PASSWORD,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each(['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'])(
    'refuses to seed when %s is missing',
    async (name) => {
      delete process.env[name];
      const client = makeClientMock();

      await expect(seedAdminUser(asClient(client))).rejects.toThrow(
        'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set',
      );
      expect(client.user.upsert).not.toHaveBeenCalled();
    },
  );

  it.each(['REPLACE_WITH_A_REAL_ADMIN_PASSWORD', 'change_me_admin'])(
    'refuses the placeholder password %s',
    async (placeholder) => {
      process.env.SEED_ADMIN_PASSWORD = placeholder;
      const client = makeClientMock();

      await expect(seedAdminUser(asClient(client))).rejects.toThrow(
        'documented placeholder',
      );
      expect(client.user.upsert).not.toHaveBeenCalled();
    },
  );

  it('upserts a verified, active ADMIN without touching an existing account', async () => {
    const client = makeClientMock();

    await seedAdminUser(asClient(client));

    expect(client.user.upsert).toHaveBeenCalledTimes(1);
    const [args] = client.user.upsert.mock.calls[0] as [
      {
        where: { email: string };
        update: object;
        create: { passwordHash: string; role: string };
      },
    ];
    expect(args.where).toEqual({ email: 'admin@hexarot.local' });
    expect(args.update).toEqual({});
    expect(args.create).toMatchObject({
      email: 'admin@hexarot.local',
      role: 'ADMIN',
      emailVerified: true,
      active: true,
    });
    await expect(
      compare(VALID_PASSWORD, args.create.passwordHash),
    ).resolves.toBe(true);
  });

  it.each(['REPLACE_WITH_A_REAL_ADMIN_PASSWORD', 'change_me_admin'])(
    'refuses to seed when the existing admin still uses the placeholder %s',
    async (placeholder) => {
      const client = makeClientMock();
      client.user.findUnique.mockResolvedValue({
        passwordHash: await hash(placeholder, 4),
      });

      await expect(seedAdminUser(asClient(client))).rejects.toThrow(
        'still uses a documented placeholder password',
      );
      expect(client.user.upsert).not.toHaveBeenCalled();
    },
  );

  it('keeps an existing admin whose password is not a placeholder', async () => {
    const client = makeClientMock();
    client.user.findUnique.mockResolvedValue({
      passwordHash: await hash('Another-real-password-7', 4),
    });

    await seedAdminUser(asClient(client));

    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@hexarot.local' },
      select: { passwordHash: true },
    });
    expect(client.user.upsert).toHaveBeenCalledTimes(1);
  });

  it.each(['.env.example', 'backend/.env.example'])(
    'refuses the SEED_ADMIN_PASSWORD value documented in %s',
    (file) => {
      const content = readFileSync(join(__dirname, '../../..', file), 'utf8');
      const documented = /^SEED_ADMIN_PASSWORD=(.*)$/m.exec(content)?.[1];

      expect(SEED_ADMIN_PASSWORD_PLACEHOLDERS).toContain(documented);
    },
  );
});
