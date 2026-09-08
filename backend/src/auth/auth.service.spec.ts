jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  };
  const mailer: jest.Mocked<MailerService> = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as never,
    mailer,
  );
  return { service, jwtService, mailer };
}

const BASE_USER = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'irrelevant-in-most-tests',
  role: 'USER',
  emailVerified: false,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthService', () => {
  describe('register', () => {
    it('rejects a duplicate email', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(BASE_USER);
      const { service } = makeService(prisma);

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'x'.repeat(12),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns a conflict when the create call loses a registration race (P2002)', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue({
        code: 'P2002',
      });
      const { service } = makeService(prisma);

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'correct-horse-battery-staple',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password, creates the user, and sends a verification email', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(BASE_USER);
      const { service, mailer } = makeService(prisma);

      const result = await service.register({
        email: 'user@example.com',
        password: 'correct-horse-battery-staple',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed `any` by @types/jest
          data: expect.objectContaining({ email: 'user@example.com' }),
        }),
      );
      const createCalls = prisma.user.create.mock.calls as Array<
        [{ data: { passwordHash: string } }]
      >;
      const createdPasswordHash = createCalls[0][0].data.passwordHash;
      expect(createdPasswordHash).not.toBe('correct-horse-battery-staple');
      expect(prisma.verificationToken.create).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method -- referencing a jest-mocked method for the matcher, never called unbound
      expect(mailer.sendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
      );
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
        emailVerified: false,
        active: true,
        createdAt: BASE_USER.createdAt,
      });
    });
  });

  describe('verifyEmail', () => {
    it('rejects an unknown token', async () => {
      const prisma = makePrismaMock();
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      const { service } = makeService(prisma);

      await expect(
        service.verifyEmail({ token: 'nope' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired token', async () => {
      const prisma = makePrismaMock();
      prisma.verificationToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
      });
      const { service } = makeService(prisma);

      await expect(
        service.verifyEmail({ token: 'expired' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the user verified and deletes the token on success', async () => {
      const prisma = makePrismaMock();
      prisma.verificationToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 1000),
      });
      const { service } = makeService(prisma);

      const result = await service.verifyEmail({ token: 'valid' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true },
      });
      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() is typed `any` by @types/jest
      expect(result).toEqual({ message: expect.any(String) });
    });
  });

  describe('resendVerification', () => {
    it('returns the same response whether or not the account exists', async () => {
      const prismaExisting = makePrismaMock();
      prismaExisting.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        emailVerified: false,
      });
      const { service: serviceExisting } = makeService(prismaExisting);

      const prismaMissing = makePrismaMock();
      prismaMissing.user.findUnique.mockResolvedValue(null);
      const { service: serviceMissing } = makeService(prismaMissing);

      const resultExisting = await serviceExisting.resendVerification({
        email: 'user@example.com',
      });
      const resultMissing = await serviceMissing.resendVerification({
        email: 'nobody@example.com',
      });

      expect(resultExisting).toEqual(resultMissing);
    });

    it('does not issue a new token for an already-verified account', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        emailVerified: true,
      });
      const { service, mailer } = makeService(prisma);

      await service.resendVerification({ email: 'user@example.com' });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- referencing a jest-mocked method for the matcher, never called unbound
      expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unknown email with a generic message', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const { service } = makeService(prisma);

      await expect(
        service.login({
          email: 'nobody@example.com',
          password: 'whatever12345',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password with the same generic message', async () => {
      const prisma = makePrismaMock();
      const passwordHash = await hash('the-real-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        passwordHash,
        emailVerified: true,
      });
      const { service } = makeService(prisma);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated account distinctly (403)', async () => {
      const prisma = makePrismaMock();
      const passwordHash = await hash('the-real-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        passwordHash,
        emailVerified: true,
        active: false,
      });
      const { service } = makeService(prisma);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'the-real-password',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unverified account distinctly from a wrong password', async () => {
      const prisma = makePrismaMock();
      const passwordHash = await hash('the-real-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        passwordHash,
        emailVerified: false,
      });
      const { service } = makeService(prisma);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'the-real-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a JWT on success', async () => {
      const prisma = makePrismaMock();
      const passwordHash = await hash('the-real-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...BASE_USER,
        passwordHash,
        emailVerified: true,
      });
      const { service, jwtService } = makeService(prisma);

      const result = await service.login({
        email: 'user@example.com',
        password: 'the-real-password',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'USER',
      });
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });
  });
});
