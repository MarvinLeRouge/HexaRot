jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

function makeContext(headers: Record<string, string>): ExecutionContext {
  const request = { headers, user: undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'USER',
    active: true,
  };

  function makeGuard(options: {
    isPublic?: boolean;
    verify?: () => Promise<{ sub: string; role: string }>;
    findUnique?: () => Promise<typeof activeUser | null>;
  }) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(options.isPublic ?? false),
    } as unknown as Reflector;
    const jwtService = {
      verifyAsync:
        options.verify ??
        jest.fn().mockRejectedValue(new Error('no token configured')),
    } as unknown as JwtService;
    const prisma = {
      user: { findUnique: options.findUnique ?? jest.fn() },
    } as unknown as PrismaService;
    return new JwtAuthGuard(reflector, jwtService, prisma);
  }

  it('allows a @Public() route through without checking a token', async () => {
    const guard = makeGuard({ isPublic: true });
    const context = makeContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a request with no Authorization header', async () => {
    const guard = makeGuard({});
    const context = makeContext({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a request with an invalid or expired token', async () => {
    const guard = makeGuard({
      verify: jest.fn().mockRejectedValue(new Error('jwt expired')),
    });
    const context = makeContext({ authorization: 'Bearer bad-token' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token whose user is no longer active', async () => {
    const guard = makeGuard({
      verify: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'USER' }),
      findUnique: jest.fn().mockResolvedValue({ ...activeUser, active: false }),
    });
    const context = makeContext({ authorization: 'Bearer good-token' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const guard = makeGuard({
      verify: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'USER' }),
      findUnique: jest.fn().mockResolvedValue(null),
    });
    const context = makeContext({ authorization: 'Bearer good-token' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user to the request and allows the call through', async () => {
    const guard = makeGuard({
      verify: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'USER' }),
      findUnique: jest.fn().mockResolvedValue(activeUser),
    });
    const context = makeContext({ authorization: 'Bearer good-token' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    const request = context.switchToHttp().getRequest<{
      user: typeof activeUser;
    }>();
    expect(request.user).toEqual(activeUser);
  });
});
