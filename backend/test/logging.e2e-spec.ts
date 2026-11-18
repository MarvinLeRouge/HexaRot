import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { buildLoggerParams } from '../src/logging/logger-params';

@Controller()
class ProbeController {
  @Get('probe')
  probe(): string {
    return 'ok';
  }

  @Get('health')
  health(): string {
    return 'ok';
  }
}

describe('Structured logging (e2e)', () => {
  let app: INestApplication;
  const lines: string[] = [];
  const stream = { write: (line: string) => lines.push(line) };
  const originalLevel = process.env.LOG_LEVEL;

  const accessLines = () =>
    lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((entry) => entry.req);

  beforeAll(async () => {
    process.env.LOG_LEVEL = 'info';
    @Module({
      imports: [LoggerModule.forRoot(buildLoggerParams(stream))],
      controllers: [ProbeController],
    })
    class ProbeModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.LOG_LEVEL = originalLevel;
  });

  beforeEach(() => {
    lines.length = 0;
  });

  it('writes one JSON access line per request, without private data', async () => {
    await request(app.getHttpServer())
      .get('/api/probe?token=secret-token')
      .set('Authorization', 'Bearer secret-jwt')
      .set('Cookie', 'sid=secret-cookie')
      .expect(200);

    const entries = accessLines();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 30,
      req: { method: 'GET', url: '/api/probe' },
      res: { statusCode: 200 },
    });
    expect(entries[0]).toHaveProperty('responseTime');
    expect(lines.join('')).not.toContain('secret');
  });

  it('does not log health checks', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(accessLines()).toHaveLength(0);
  });
});
