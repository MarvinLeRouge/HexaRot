import { Module } from '@nestjs/common';
import { KeyCodec } from './key-codec';

@Module({
  providers: [KeyCodec],
  exports: [KeyCodec],
})
export class KeyModule {}
