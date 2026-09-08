jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrismaMock() {
  return {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  return new AdminUsersService(prisma as unknown as PrismaService);
}

describe('AdminUsersService', () => {
  describe('list', () => {
    it('selects only the public-safe fields, ordered by createdAt', async () => {
      const prisma = makePrismaMock();
      prisma.user.findMany.mockResolvedValue([]);
      const service = makeService(prisma);

      await service.list();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('setActive', () => {
    it('rejects an admin trying to modify their own account', async () => {
      const prisma = makePrismaMock();
      const service = makeService(prisma);

      await expect(
        service.setActive('admin-1', false, 'admin-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown target user', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = makeService(prisma);

      await expect(
        service.setActive('missing', false, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the target user active flag', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-1', active: false });
      const service = makeService(prisma);

      const result = await service.setActive('user-1', false, 'admin-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { active: false },
        }),
      );
      expect(result).toEqual({ id: 'user-1', active: false });
    });
  });

  describe('remove', () => {
    it('rejects an admin trying to delete their own account', async () => {
      const prisma = makePrismaMock();
      const service = makeService(prisma);

      await expect(service.remove('admin-1', 'admin-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an unknown target user', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = makeService(prisma);

      await expect(service.remove('missing', 'admin-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes the target user', async () => {
      const prisma = makePrismaMock();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      const service = makeService(prisma);

      await service.remove('user-1', 'admin-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
