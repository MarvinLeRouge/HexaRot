import { Module } from '@nestjs/common';
import { PngRenderer } from './png-renderer';

@Module({
  providers: [PngRenderer],
  exports: [PngRenderer],
})
export class RendererModule {}
