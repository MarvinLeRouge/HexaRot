jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { KeyParseResult } from '../src/api/key.service';
import { HexahueAlphabet } from '../src/alphabet/hexahue-alphabet.service';
import { MockAlphabet } from './utils/mock-alphabet';
import { MALFORMED_KEY_STRINGS } from './fixtures/api.fixtures';

interface KeyGenerateResult {
  key: string;
}

describe('Key endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(HexahueAlphabet)
      .useValue(new MockAlphabet())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/key/generate', () => {
    it('returns 200 with a valid HR key string for a fully specified parameter set', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({
          pivotBlockSize: 7,
          rotationSequence: [0, 1, 2, 3],
          rotationDirection: 'cw',
          readingOrder: 'LR-TB',
        });
      expect(res.status).toBe(200);
      const body = res.body as KeyGenerateResult;
      expect(body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it('returns 200 with a valid HR key string when no body is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({});
      expect(res.status).toBe(200);
      const body = res.body as KeyGenerateResult;
      expect(body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it.each([
      'LR-TB',
      'RL-TB',
      'TB-LR',
      'BT-LR',
      'LR-TB-ALT',
      'RL-TB-ALT',
      'TB-LR-ALT',
      'BT-LR-ALT',
    ])(
      'returns 200 with a valid HR key string for reading order %s',
      async (readingOrder) => {
        const res = await request(app.getHttpServer())
          .post('/api/key/generate')
          .send({ readingOrder });
        expect(res.status).toBe(200);
        const body = res.body as KeyGenerateResult;
        expect(body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      },
    );

    it.each(['cw', 'ccw'])(
      'returns 200 with a valid HR key string for rotation direction %s',
      async (rotationDirection) => {
        const res = await request(app.getHttpServer())
          .post('/api/key/generate')
          .send({ rotationDirection });
        expect(res.status).toBe(200);
        const body = res.body as KeyGenerateResult;
        expect(body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
      },
    );

    it('returns 400 when rotationDirection is an invalid value', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ rotationDirection: 'sideways' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when readingOrder is an unknown value', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ readingOrder: 'DIAGONAL' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when pivotBlockSize is not a positive integer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({ pivotBlockSize: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/key/parse', () => {
    it('returns 200 with all decoded params for a valid HR key', async () => {
      const generateRes = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send({
          pivotBlockSize: 5,
          rotationSequence: [0, 1, 2, 3],
          rotationDirection: 'cw',
          readingOrder: 'LR-TB',
        });
      const { key } = generateRes.body as KeyGenerateResult;

      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key });

      expect(res.status).toBe(200);
      const body = res.body as KeyParseResult;
      expect(body.pivotBlockSize).toBe(5);
      expect(body.rotationSequence).toEqual([0, 90, 180, 270]);
      expect(body.rotationDirection).toBe('cw');
      expect(body.readingOrder).toBe('LR-TB');
    });

    it('returns 400 for a malformed key string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key: 'not-a-key' });
      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS.filter((k) => k !== ''))(
      'returns 400 for malformed key: %s',
      async (malformedKey) => {
        const res = await request(app.getHttpServer())
          .get('/api/key/parse')
          .query({ key: malformedKey });
        expect(res.status).toBe(400);
      },
    );

    it('returns 400 for an empty key query param', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when the key query param is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/key/parse');
      expect(res.status).toBe(400);
    });
  });

  describe('round-trip', () => {
    it('generates a key and parses it back to recover the original params without data loss', async () => {
      const requestBody = {
        pivotBlockSize: 11,
        rotationSequence: [2, 0, 3, 1],
        rotationDirection: 'ccw',
        readingOrder: 'BT-LR-ALT',
      };

      const generateRes = await request(app.getHttpServer())
        .post('/api/key/generate')
        .send(requestBody);
      const { key } = generateRes.body as KeyGenerateResult;

      const parseRes = await request(app.getHttpServer())
        .get('/api/key/parse')
        .query({ key });

      expect(parseRes.status).toBe(200);
      const parseBody = parseRes.body as KeyParseResult;
      expect(parseBody.pivotBlockSize).toBe(requestBody.pivotBlockSize);
      expect(parseBody.rotationSequence).toEqual(
        requestBody.rotationSequence.map((i) => i * 90),
      );
      expect(parseBody.rotationDirection).toBe(requestBody.rotationDirection);
      expect(parseBody.readingOrder).toBe(requestBody.readingOrder);
    });
  });
});
