import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { DecodeResult } from '../src/api/decode.service';
import { EncodeResult } from '../src/api/encode.service';

type EncodeResponseBody = EncodeResult;
type DecodeResponseBody = DecodeResult;

const BASE_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
  size: 'medium',
};

describe('POST /api/decode (e2e)', () => {
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

  async function encode(
    body: Record<string, unknown>,
  ): Promise<EncodeResponseBody> {
    const res = await request(app.getHttpServer())
      .post('/api/encode')
      .send(body);
    return res.body as EncodeResponseBody;
  }

  describe('round-trip', () => {
    it('decodes a PNG cryptogram produced by POST /encode and recovers the original message', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'medium',
      });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('ABC')).toBe(true);
    });

    it('decodes an SVG cryptogram produced by POST /encode and recovers the original message', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: encoded.svg,
        format: 'svg',
        key: encoded.key,
        size: 'medium',
      });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('ABC')).toBe(true);
    });

    it.each(['LR-TB', 'RL-TB', 'TB-LR', 'BT-LR'])(
      'recovers the message for reading order %s',
      async (readingOrder) => {
        const encoded = await encode({ ...BASE_ENCODE_BODY, readingOrder });
        const res = await request(app.getHttpServer())
          .post('/api/decode')
          .send({
            cryptogram: encoded.png,
            format: 'png',
            key: encoded.key,
            size: 'medium',
          });

        expect(res.status).toBe(200);
        const body = res.body as DecodeResponseBody;
        expect(body.message.startsWith('ABC')).toBe(true);
      },
    );

    it.each(['cw', 'ccw'])(
      'recovers the message for rotation direction %s',
      async (rotationDirection) => {
        const encoded = await encode({
          ...BASE_ENCODE_BODY,
          rotationDirection,
        });
        const res = await request(app.getHttpServer())
          .post('/api/decode')
          .send({
            cryptogram: encoded.png,
            format: 'png',
            key: encoded.key,
            size: 'medium',
          });

        expect(res.status).toBe(200);
        const body = res.body as DecodeResponseBody;
        expect(body.message.startsWith('ABC')).toBe(true);
      },
    );

    it('recovers a multi-word message with spaces', async () => {
      const encoded = await encode({
        ...BASE_ENCODE_BODY,
        message: 'HELLO WORLD',
      });
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'medium',
      });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('HELLO WORLD')).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when cryptogram is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ format: 'png', key: 'HR1.0000', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'irrelevant', format: 'png', size: 'medium' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is malformed', async () => {
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'irrelevant',
        format: 'png',
        key: 'not-a-key',
        size: 'medium',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when format is not png or svg', async () => {
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'irrelevant',
        format: 'gif',
        key: 'HR1.0000',
        size: 'medium',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid base64 for PNG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'not a png at all',
        format: 'png',
        key: encoded.key,
        size: 'medium',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid SVG for SVG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'not svg at all',
        format: 'svg',
        key: encoded.key,
        size: 'medium',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is missing', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is not small, medium, or large', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'huge',
      });
      expect(res.status).toBe(400);
    });
  });
});
