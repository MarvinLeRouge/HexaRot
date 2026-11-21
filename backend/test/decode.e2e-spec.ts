import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { configureBodyLimits } from '../src/configure-body-limits';
import { MAX_ENCODE_MESSAGE_LENGTH } from '../src/cipher/max-message-length';
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

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureBodyLimits(app);
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
          });

        expect(res.status).toBe(200);
        const body = res.body as DecodeResponseBody;
        expect(body.message.startsWith('ABC')).toBe(true);
      },
    );

    it('recovers the message with a 12-angle V2 sequence with repeated angles', async () => {
      const encoded = await encode({
        ...BASE_ENCODE_BODY,
        message: 'VARIABLE LENGTH',
        rotationSequence: [3, 3, 1, 0, 2, 1, 1, 0, 0, 2, 3, 1],
      });
      expect(encoded.key).toMatch(/^HR2·[0-9A-Z]{9}$/);
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('VARIABLE LENGTH')).toBe(true);
    });

    it('still decodes with a V1 key describing the same parameters', async () => {
      const encoded = await encode({
        ...BASE_ENCODE_BODY,
        rotationSequence: [2, 0, 3, 1],
      });
      // V1 payload: pivotBlockSize=5, LR-TB, cw, permutation 13 ([2,0,3,1]), medium.
      const v1Payload = 5 | (13 << 12) | (1 << 17);
      const v1Key = `HR1·${v1Payload.toString(36).toUpperCase().padStart(4, '0')}`;
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: v1Key });

      expect(res.status).toBe(200);
      const body = res.body as DecodeResponseBody;
      expect(body.message.startsWith('ABC')).toBe(true);
    });

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
        .send({ format: 'png', key: 'HR1.0000' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: 'irrelevant', format: 'png' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when key is malformed', async () => {
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'irrelevant',
        format: 'png',
        key: 'not-a-key',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 without echoing back a key longer than any real key', async () => {
      const longKey = `HR2·${'A'.repeat(10_000)}`;
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'irrelevant',
        format: 'png',
        key: longKey,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toContain('A'.repeat(100));
    });

    it('returns 400 when format is not png or svg', async () => {
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'irrelevant',
        format: 'gif',
        key: 'HR1.0000',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid base64 for PNG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'not a png at all',
        format: 'png',
        key: encoded.key,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when cryptogram is not valid SVG for SVG format', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: 'not svg at all',
        format: 'svg',
        key: encoded.key,
      });
      expect(res.status).toBe(400);
    });

    it("decodes without a size, using the key's own size", async () => {
      const encoded = await encode({ ...BASE_ENCODE_BODY, size: 'small' });
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({ cryptogram: encoded.png, format: 'png', key: encoded.key });
      expect(res.status).toBe(200);
      expect((res.body as { message: string }).message.startsWith('ABC')).toBe(
        true,
      );
    });

    it('ignores any size value sent with the request, even an invalid one', async () => {
      const encoded = await encode(BASE_ENCODE_BODY);
      const res = await request(app.getHttpServer()).post('/api/decode').send({
        cryptogram: encoded.png,
        format: 'png',
        key: encoded.key,
        size: 'huge',
      });
      expect(res.status).toBe(200);
    });
  });

  describe('request body size', () => {
    it.each(['svg', 'png'] as const)(
      'decodes the largest %s cryptogram POST /encode can produce',
      async (format) => {
        // Pivot 255 pads a maximum-length message the most (510 x 510 cases),
        // and medium is the largest size that fits the pixel budget for it
        const encoded = await encode({
          ...BASE_ENCODE_BODY,
          message: 'A'.repeat(MAX_ENCODE_MESSAGE_LENGTH),
          pivotBlockSize: 255,
          size: 'medium',
        });
        const res = await request(app.getHttpServer())
          .post('/api/decode')
          .send({ cryptogram: encoded[format], format, key: encoded.key });

        expect(res.status).toBe(200);
        expect(
          (res.body as DecodeResponseBody).message.startsWith(
            'A'.repeat(MAX_ENCODE_MESSAGE_LENGTH),
          ),
        ).toBe(true);
      },
      120000,
    );

    it('returns 413 when the body is over the decode limit', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/decode')
        .send({
          cryptogram: 'x'.repeat(25 * 1024 * 1024),
          format: 'svg',
          key: 'HR1·2T51',
        });
      expect(res.status).toBe(413);
    });

    it('keeps a small limit on other routes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...BASE_ENCODE_BODY, message: 'A'.repeat(300 * 1024) });
      expect(res.status).toBe(413);
    });

    it('accepts any maximum-length message on encode, even one JSON escapes to 6 bytes per character', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({
          ...BASE_ENCODE_BODY,
          message: '\u0001'.repeat(MAX_ENCODE_MESSAGE_LENGTH),
        });
      expect(res.status).not.toBe(413);
    });
  });
});
