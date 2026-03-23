import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
