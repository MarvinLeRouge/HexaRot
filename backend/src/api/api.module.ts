import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [EncodeController],
  providers: [EncodeService],
})
export class ApiModule {}
