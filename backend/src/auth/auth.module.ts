import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailerModule } from '../mailer/mailer.module';

/**
 * Exports JwtModule (re-export) so that AppModule's global JwtAuthGuard
 * (registered via APP_GUARD with useClass) can resolve its JwtService
 * dependency without importing JwtModule a second time.
 */
const JWT_SECRET_MIN_LENGTH = 32;

/**
 * Rejects a missing, documented-placeholder, or low-entropy JWT_SECRET at
 * boot rather than letting the app start and silently sign every token
 * with a value an attacker can read straight out of .env.example.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set');
  }
  if (secret === 'change_me') {
    throw new Error(
      'JWT_SECRET must not be the documented placeholder value from .env.example - set a real secret',
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters`,
    );
  }
  return secret;
}

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const parsedExpiresIn = Number(process.env.JWT_EXPIRES_IN);
        const expiresIn =
          Number.isFinite(parsedExpiresIn) && parsedExpiresIn > 0
            ? parsedExpiresIn
            : 3600;
        return {
          secret: resolveJwtSecret(),
          signOptions: { expiresIn },
        };
      },
    }),
    MailerModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
