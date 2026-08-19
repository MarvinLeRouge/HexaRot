import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HexahueAlphabet } from './hexahue-alphabet.service';

@Module({
  imports: [PrismaModule],
  providers: [HexahueAlphabet],
  exports: [HexahueAlphabet],
})
export class AlphabetModule {}
