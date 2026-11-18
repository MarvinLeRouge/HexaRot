import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AppController', () => {
  let appController: AppController;
  const queryRaw = jest.fn();

  beforeEach(async () => {
    queryRaw.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('reports ok when the database answers', async () => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
      });
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it('answers 503 when the database is unreachable', async () => {
      queryRaw.mockRejectedValue(new Error('connection refused'));

      const result = appController.getHealth();

      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(result).rejects.toMatchObject({
        response: { status: 'error' },
      });
    });
  });
});
