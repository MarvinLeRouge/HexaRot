import { Module } from '@nestjs/common';
import { HexahueAlphabet } from './hexahue-alphabet.service';

@Module({
  providers: [HexahueAlphabet],
  exports: [HexahueAlphabet],
})
export class AlphabetModule {}
