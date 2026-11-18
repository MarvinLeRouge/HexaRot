// Must stay the first import: Sentry patches modules before they load
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureBodyLimits } from './configure-body-limits';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    // Held until pino takes over, so boot logs are JSON too
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  configureBodyLimits(app);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
