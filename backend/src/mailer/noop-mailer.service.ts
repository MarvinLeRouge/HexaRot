import { Injectable } from '@nestjs/common';
import { MailerService } from './mailer.service';

/**
 * Test double used whenever NODE_ENV is "test". Records the last verification
 * email instead of sending it, so e2e tests can read the raw token back out.
 */
@Injectable()
export class NoopMailerService implements MailerService {
  lastVerificationToken: { to: string; token: string } | undefined;

  // eslint-disable-next-line @typescript-eslint/require-await
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    this.lastVerificationToken = { to, token };
  }
}
