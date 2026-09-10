import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { CorrelationScoreResult } from '../src/api/correlation-score.service';
import {
  VALID_ENCODE_BODY,
  VALID_ENCODE_BODY_WITH_KEY,
  MALFORMED_KEY_STRINGS,
} from './fixtures/api.fixtures';

describe('POST /api/correlation-score (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

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

  describe('happy path', () => {
    it('returns 200 with a score in [0, 1] for a valid params body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as CorrelationScoreResult;
      expect(typeof body.score).toBe('number');
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(1);
    });

    it('returns 200 with a score in [0, 1] for a valid key body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY_WITH_KEY);

      expect(res.status).toBe(200);
      const body = res.body as CorrelationScoreResult;
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(1);
    });

    it('returns the identical score across repeated requests with the same body', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);
      const second = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(VALID_ENCODE_BODY);

      expect((second.body as CorrelationScoreResult).score).toBe(
        (first.body as CorrelationScoreResult).score,
      );
    });

    it('returns 200 with score 1 for an all-whitespace message (single-colour grid)', async () => {
      // 25 spaces with VALID_ENCODE_BODY's pivotBlockSize (5) exactly fills
      // the grid (zero padding cells), so the whole body grid is pure black,
      // genuinely reproducing the single-colour scenario: shorter
      // whitespace-only messages here still leave padding cells, which are
      // drawn from the full palette and are not black, so they do not
      // reproduce the bug.
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send({ ...VALID_ENCODE_BODY, message: ' '.repeat(25) });

      expect(res.status).toBe(200);
      const body = res.body as CorrelationScoreResult;
      expect(body.score).toBe(1);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when message is missing', async () => {
      const { message, ...rest } = VALID_ENCODE_BODY;
      void message;
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send(rest);

      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS)(
      'returns 400 for malformed key %p',
      async (key) => {
        const res = await request(app.getHttpServer())
          .post('/api/correlation-score')
          .send({ message: 'ABC', key });

        expect(res.status).toBe(400);
      },
    );

    it('returns 400 when size is present (rejected, strict DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send({ ...VALID_ENCODE_BODY, size: 'large' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when rotationSequence is not a valid permutation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/correlation-score')
        .send({ ...VALID_ENCODE_BODY, rotationSequence: [0, 0, 0, 0] });

      expect(res.status).toBe(400);
    });
  });
});
