import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Module,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { captureException } from '@sentry/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

// SentryGlobalFilter calls captureException from @sentry/core directly
jest.mock('@sentry/core', () => ({
  ...jest.requireActual<object>('@sentry/core'),
  captureException: jest.fn(),
}));

@Controller('probe')
class ProbeController {
  @Get('crash')
  crash(): never {
    throw new Error('unexpected failure');
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('invalid input');
  }

  @Get('unauthorized')
  unauthorized(): never {
    throw new UnauthorizedException();
  }
}

@Module({
  controllers: [ProbeController],
  // Same registration as AppModule
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
class ProbeModule {}

describe('Error tracking (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  beforeEach(() => {
    jest.mocked(captureException).mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports an unhandled error and still answers 500', async () => {
    const res = await request(app.getHttpServer()).get('/probe/crash');

    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['400', '/probe/bad-request', 400],
    ['401', '/probe/unauthorized', 401],
  ])('does not report an expected %s', async (_label, path, status) => {
    const res = await request(app.getHttpServer()).get(path);

    expect(res.status).toBe(status);
    expect(captureException).not.toHaveBeenCalled();
  });
});
