import { compare, hash } from 'bcryptjs';
import type { PrismaClient } from '../generated/prisma/client';

/** Placeholder passwords the seed refuses, so an unedited env file never
 * creates an admin account with a password published in the repository. */
export const SEED_ADMIN_PASSWORD_PLACEHOLDERS: readonly string[] = [
  'REPLACE_WITH_A_REAL_ADMIN_PASSWORD',
  'change_me_admin',
];

/**
 * Idempotently upserts the single seeded admin account. HexaRot has exactly
 * one admin account by design (see FEAT-021 spec, Decision 1).
 */
export async function seedAdminUser(client: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set to seed the admin account',
    );
  }
  if (SEED_ADMIN_PASSWORD_PLACEHOLDERS.includes(password)) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must not be the documented placeholder value from .env.example - set a real password',
    );
  }
  await assertExistingAdminPasswordIsNotPlaceholder(client, email);
  const passwordHash = await hash(password, 12);

  await client.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      active: true,
    },
  });
}

/** The upsert never updates an existing account, so an admin seeded before
 * the placeholder guard existed would otherwise keep a public password. */
async function assertExistingAdminPasswordIsNotPlaceholder(
  client: PrismaClient,
  email: string,
): Promise<void> {
  const existing = await client.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (!existing) return;
  for (const placeholder of SEED_ADMIN_PASSWORD_PLACEHOLDERS) {
    if (await compare(placeholder, existing.passwordHash)) {
      throw new Error(
        `The existing admin account ${email} still uses a documented placeholder password - change it before seeding again`,
      );
    }
  }
}
