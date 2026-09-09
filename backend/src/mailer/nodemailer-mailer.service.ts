import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { MailerService } from './mailer.service';

/** Real SMTP implementation, used whenever NODE_ENV is not "test" (Brevo relay). */
@Injectable()
export class NodemailerMailerService implements MailerService {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASSWORD;
    const fromName = process.env.MAIL_STD_NAME;
    const fromEmail = process.env.MAIL_STD_EMAIL;
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL;

    if (
      !host ||
      !port ||
      !user ||
      !pass ||
      !fromName ||
      !fromEmail ||
      !frontendBaseUrl
    ) {
      throw new Error('SMTP is not configured');
    }

    const from = `${fromName} <${fromEmail}>`;

    const transport = createTransport({
      host,
      port: Number(port),
      auth: { user, pass },
    });

    const link = `${frontendBaseUrl}/verify-email?token=${token}`;

    await transport.sendMail({
      from,
      to,
      subject: 'Verify your HexaRot account',
      text: `Confirm your email address by visiting: ${link}`,
    });
  }
}
