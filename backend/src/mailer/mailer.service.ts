/** Sends transactional emails for the auth flow. */
export interface MailerService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}

/** DI token for {@link MailerService}, since it is an interface (no runtime class). */
export const MAILER_SERVICE = Symbol('MAILER_SERVICE');
