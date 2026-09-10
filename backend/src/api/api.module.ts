import { Module } from '@nestjs/common';
import { AlphabetModule } from '../alphabet/alphabet.module';
import { RotationModule } from '../rotation/rotation.module';
import { RendererModule } from '../renderer/renderer.module';
import { EncodeController } from './encode.controller';
import { EncodeService } from './encode.service';
import { KeyController } from './key.controller';
import { KeyService } from './key.service';
import { DecodeController } from './decode.controller';
import { DecodeService } from './decode.service';
import { CorrelationScoreController } from './correlation-score.controller';
import { CorrelationScoreService } from './correlation-score.service';

@Module({
  imports: [AlphabetModule, RotationModule, RendererModule],
  controllers: [
    EncodeController,
    KeyController,
    DecodeController,
    CorrelationScoreController,
  ],
  providers: [
    EncodeService,
    KeyService,
    DecodeService,
    CorrelationScoreService,
  ],
})
export class ApiModule {}
