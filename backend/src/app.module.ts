import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerParams } from './logging/logger-params';
import { AppController } from './app.controller';
import { AppThrottlerGuard } from './app-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AlphabetModule } from './alphabet/alphabet.module';
import { CipherModule } from './cipher/cipher.module';
import { RotationModule } from './rotation/rotation.module';
import { KeyModule } from './key/key.module';
import { ReadingOrderModule } from './reading-order/reading-order.module';
import { RendererModule } from './renderer/renderer.module';
import { ValidationModule } from './validation/validation.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule.forRoot(buildLoggerParams()),
    PrismaModule,
    AlphabetModule,
    CipherModule,
    RotationModule,
    KeyModule,
    ReadingOrderModule,
    RendererModule,
    ValidationModule,
    ApiModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    AuthModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    // Reports only unexpected errors: HttpExceptions (4xx) are skipped.
    // Nest warns that its constructor argument is undefined: expected, the
    // filter gets the HTTP adapter through property injection instead.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
