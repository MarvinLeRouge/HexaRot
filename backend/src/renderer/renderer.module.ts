import { Module } from '@nestjs/common';
import { PngRenderer } from './png-renderer';
import { SvgRenderer } from './svg-renderer';

@Module({
  providers: [PngRenderer, SvgRenderer],
  exports: [PngRenderer, SvgRenderer],
})
export class RendererModule {}
