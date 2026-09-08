/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const sendMailMock = jest.fn().mockResolvedValue(undefined);
const createTransportMock = jest
  .fn()
  .mockReturnValue({ sendMail: sendMailMock });

jest.mock('nodemailer', () => ({
  createTransport: createTransportMock,
}));

import { NodemailerMailerService } from './nodemailer-mailer.service';

describe('NodemailerMailerService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: '587',
      SMTP_USER: 'brevo-user',
      SMTP_PASS: 'brevo-pass',
      SMTP_FROM: 'no-reply@hexarot.local',
      FRONTEND_BASE_URL: 'http://localhost:5173',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('sends a verification email with a POST-friendly link and the raw token', async () => {
    const service = new NodemailerMailerService();

    await service.sendVerificationEmail('user@example.com', 'raw-token-123');

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: { user: 'brevo-user', pass: 'brevo-pass' },
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@hexarot.local',
        to: 'user@example.com',
        subject: expect.any(String),
        text: expect.stringContaining(
          'http://localhost:5173/verify-email?token=raw-token-123',
        ),
      }),
    );
  });

  it('throws when SMTP config is incomplete', async () => {
    process.env.SMTP_USER = '';
    const service = new NodemailerMailerService();

    await expect(
      service.sendVerificationEmail('user@example.com', 'raw-token-123'),
    ).rejects.toThrow('SMTP is not configured');
  });
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
