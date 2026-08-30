import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lumina Payment API')
    .setDescription(
      'Comprehensive payment processing API for Stellar-based payments, ' +
      'webhooks, account management, crypto operations, fraud detection, ' +
      'and zero-knowledge proof verification.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication and authorization')
    .addTag('payments', 'Payment operations')
    .addTag('webhooks', 'Webhook management')
    .addTag('accounts', 'Account management')
    .addTag('crypto', 'Cryptographic operations')
    .addTag('zkp', 'Zero-knowledge proof operations')
    .addTag('fraud-detection', 'Fraud detection and rules')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('ramp', 'On-ramp and off-ramp operations')
    .addTag('tenant', 'Multi-tenant management')
    .addTag('rate-limits', 'Rate limiting policies')
    .addTag('ledger', 'Distributed ledger operations')
    .addTag('cache', 'Cache management')
    .addServer('http://localhost:4000', 'Local Development')
    .addServer('https://api.lumina.io', 'Production')
    .addServer('https://staging-api.lumina.io', 'Staging')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Lumina API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`Backend API running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
