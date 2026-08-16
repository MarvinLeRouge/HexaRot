// Prevent Jest from parsing PrismaService's generated ESM Prisma client.
jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { EncodeResult } from '../src/api/encode.service';
import { HexahueAlphabet } from '../src/alphabet/hexahue-alphabet.service';
import { MockAlphabet } from './utils/mock-alphabet';
import {
  VALID_ENCODE_BODY,
  VALID_ENCODE_BODY_WITH_KEY,
  WEAK_ENCODE_BODY,
  ENCODE_BODY_WITH_UNKNOWN_CHARS,
  MALFORMED_KEY_STRINGS,
} from './fixtures/api.fixtures';

describe('POST /api/encode (e2e)', () => {
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

  describe('happy path', () => {
    it('returns 200 with a valid base64 PNG string in png', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      const pngBuffer = Buffer.from(body.png, 'base64');
      expect(pngBuffer.subarray(0, 4)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );
    });

    it('returns 200 with a valid SVG string in svg', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.svg.startsWith('<svg')).toBe(true);
    });

    it('returns 200 with a valid HR key string in key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.key).toMatch(/^HR1·[0-9A-Z]{4}$/);
    });

    it('returns 200 with an empty warnings array when params are strong', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.warnings).toEqual([]);
    });

    it('returns 200 with an empty unknownChars array for a clean ASCII message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.unknownChars).toEqual([]);
    });

    it('generates a key from individual params when no key field is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(typeof body.key).toBe('string');
    });

    it('uses the provided key and ignores individual params when key is present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(VALID_ENCODE_BODY_WITH_KEY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.key).toBe(VALID_ENCODE_BODY_WITH_KEY.key);
    });

    it.each(['small', 'medium', 'large'])(
      'encodes the message with size %s without error',
      async (size) => {
        const res = await request(app.getHttpServer())
          .post('/api/encode')
          .send({ ...VALID_ENCODE_BODY, size });
        expect(res.status).toBe(200);
      },
    );
  });

  describe('weakness warning', () => {
    it('returns 200 with a non-empty warnings array when pivotBlockSize is weak', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(WEAK_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.warnings.length).toBeGreaterThan(0);
    });

    it('returns 200 and does not block encoding when a weakness warning is present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(WEAK_ENCODE_BODY);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(typeof body.png).toBe('string');
    });

    it('returns 200 with an empty warnings array when overrideWeaknessWarning=true and pivotBlockSize=weak', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...WEAK_ENCODE_BODY, overrideWeaknessWarning: true });

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.warnings).toEqual([]);
    });
  });

  describe('unknown characters', () => {
    it('returns 200 with the unknown characters listed in unknownChars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(ENCODE_BODY_WITH_UNKNOWN_CHARS);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(body.unknownChars).toEqual(
        expect.arrayContaining(['X', 'Y', 'Z']),
      );
    });

    it('encodes the remaining supported characters when unknown chars are present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(ENCODE_BODY_WITH_UNKNOWN_CHARS);

      expect(res.status).toBe(200);
      const body = res.body as EncodeResult;
      expect(typeof body.png).toBe('string');
    });
  });

  describe('validation errors', () => {
    it('returns 400 when message is missing', async () => {
      const { message, ...rest } = VALID_ENCODE_BODY;
      void message;
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send(rest);
      expect(res.status).toBe(400);
    });

    it('returns 400 when message is an empty string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, message: '' });
      expect(res.status).toBe(400);
    });

    it.each(MALFORMED_KEY_STRINGS)(
      'returns 400 when key is malformed: %s',
      async (malformedKey) => {
        const res = await request(app.getHttpServer())
          .post('/api/encode')
          .send({ message: 'ABC', key: malformedKey });
        expect(res.status).toBe(400);
      },
    );

    it('returns 400 when pivotBlockSize exceeds 255', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, pivotBlockSize: 256 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rotationDirection is not cw or ccw', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, rotationDirection: 'sideways' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when size is not small, medium, or large', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, size: 'huge' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when extra fields are present in the body (strict DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/encode')
        .send({ ...VALID_ENCODE_BODY, extraField: 'nope' });
      expect(res.status).toBe(400);
    });
  });
});
