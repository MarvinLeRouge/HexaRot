import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MAILER_SERVICE } from '../src/mailer/mailer.service';
import { NoopMailerService } from '../src/mailer/noop-mailer.service';
import { uniqueTestEmail, VALID_PASSWORD } from './fixtures/auth.fixtures';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: NoopMailerService;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    prisma = app.get(PrismaService);
    mailer = app.get(MAILER_SERVICE);
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await app.close();
  });

  it('rejects an unauthenticated request to a protected route', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('registers, verifies, logs in, and accesses a protected route', async () => {
    const email = uniqueTestEmail('register-flow');
    createdEmails.push(email);

    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: VALID_PASSWORD })
      .expect(201);
    expect(registerRes.body).toMatchObject({
      email,
      role: 'USER',
      emailVerified: false,
      active: true,
    });
    expect(
      (registerRes.body as { passwordHash?: unknown }).passwordHash,
    ).toBeUndefined();

    const loginBeforeVerify = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: VALID_PASSWORD })
      .expect(401);
    expect((loginBeforeVerify.body as { message: string }).message).toMatch(
      /not verified/i,
    );

    expect(mailer.lastVerificationToken?.to).toBe(email);
    const token = mailer.lastVerificationToken?.token;
    expect(typeof token).toBe('string');

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token })
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: VALID_PASSWORD })
      .expect(200);
    const accessToken = (loginRes.body as { accessToken: string }).accessToken;
    expect(typeof accessToken).toBe('string');

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body).toMatchObject({ email, role: 'USER' });

    await request(app.getHttpServer())
      .post('/api/key/parse')
      .send({ key: 'not-a-real-key' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/key/parse')
      .send({ key: 'not-a-real-key' })
      .expect(401);
  });

  it('rejects login with a wrong password', async () => {
    const email = uniqueTestEmail('wrong-password');
    createdEmails.push(email);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: VALID_PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'not-the-right-password' })
      .expect(401);
  });

  it('rejects a duplicate registration', async () => {
    const email = uniqueTestEmail('duplicate');
    createdEmails.push(email);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: VALID_PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: VALID_PASSWORD })
      .expect(409);
  });

  it('returns the same response for resend-verification whether or not the account exists', async () => {
    const existingRes = await request(app.getHttpServer())
      .post('/api/auth/resend-verification')
      .send({ email: 'nobody-at-all@example.com' })
      .expect(202);

    expect(existingRes.body as { message: string }).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() is typed `any` by @types/jest
      message: expect.any(String),
    });
  });

  describe('admin moderation', () => {
    let adminToken: string;
    let targetUserId: string;
    let targetEmail: string;

    beforeAll(async () => {
      const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@hexarot.local';
      const adminPassword =
        process.env.SEED_ADMIN_PASSWORD ?? 'change_me_admin';

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);
      adminToken = (loginRes.body as { accessToken: string }).accessToken;

      targetEmail = uniqueTestEmail('admin-target');
      createdEmails.push(targetEmail);
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: targetEmail, password: VALID_PASSWORD })
        .expect(201);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: targetEmail },
      });
      targetUserId = user.id;
    });

    it('rejects a non-admin from listing users', async () => {
      const nonAdminEmail = uniqueTestEmail('non-admin');
      createdEmails.push(nonAdminEmail);
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: nonAdminEmail, password: VALID_PASSWORD })
        .expect(201);
      const nonAdminUser = await prisma.user.update({
        where: { email: nonAdminEmail },
        data: { emailVerified: true },
      });
      void nonAdminUser;
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: nonAdminEmail, password: VALID_PASSWORD })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set(
          'Authorization',
          `Bearer ${(loginRes.body as { accessToken: string }).accessToken}`,
        )
        .expect(403);
    });

    it('lists users as admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (res.body as Array<{ email: string }>).some(
          (u) => u.email === targetEmail,
        ),
      ).toBe(true);
    });

    it('deactivates a user, who then loses access even with an existing token', async () => {
      const targetLoginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: targetEmail, password: VALID_PASSWORD })
        .expect(401);
      expect((targetLoginRes.body as { message: string }).message).toMatch(
        /not verified/i,
      );

      await prisma.user.update({
        where: { id: targetUserId },
        data: { emailVerified: true },
      });
      const verifiedLoginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: targetEmail, password: VALID_PASSWORD })
        .expect(200);
      const targetToken = (verifiedLoginRes.body as { accessToken: string })
        .accessToken;

      await request(app.getHttpServer())
        .patch(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${targetToken}`)
        .expect(401);
    });

    it('rejects the admin trying to deactivate or delete themselves', async () => {
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@hexarot.local' },
      });

      await request(app.getHttpServer())
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('deletes a user as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const deleted = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      expect(deleted).toBeNull();
    });
  });
});
