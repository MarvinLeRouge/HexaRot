import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
