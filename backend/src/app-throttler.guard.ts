import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Global rate limiter for the whole API. Skips enforcement when
 * NODE_ENV=test (set automatically by Jest) so that e2e/integration
 * suites, which legitimately fire many register/login requests back to
 * back from the same client, are not tripped up by limits designed to
 * stop real-world brute-force and spam traffic. Mirrors the same
 * NODE_ENV-based test/production split already used by MailerModule to
 * pick NoopMailerService over NodemailerMailerService.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(_context: ExecutionContext): Promise<boolean> {
    void _context;
    return Promise.resolve(process.env.NODE_ENV === 'test');
  }
}
