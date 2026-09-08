import { Module } from '@nestjs/common';
import { MAILER_SERVICE } from './mailer.service';
import { NoopMailerService } from './noop-mailer.service';
import { NodemailerMailerService } from './nodemailer-mailer.service';

/**
 * Selects the mailer implementation at module-load time: NoopMailerService
 * in tests (NODE_ENV=test, set automatically by Jest), NodemailerMailerService
 * otherwise (development and production both send real emails).
 */
@Module({
  providers: [
    {
      provide: MAILER_SERVICE,
      useClass:
        process.env.NODE_ENV === 'test'
          ? NoopMailerService
          : NodemailerMailerService,
    },
  ],
  exports: [MAILER_SERVICE],
})
export class MailerModule {}
