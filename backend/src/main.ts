import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { winstonConfig } from './common/logger/winston.config';
import { initSentry } from './common/tracking/sentry';

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: winston.createLogger(winstonConfig) }),
  });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`Backend API running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
