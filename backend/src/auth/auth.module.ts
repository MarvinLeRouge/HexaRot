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
          secret: process.env.JWT_SECRET,
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
