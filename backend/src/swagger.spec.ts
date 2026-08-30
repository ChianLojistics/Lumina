import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('Swagger / OpenAPI (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    const config = new DocumentBuilder()
      .setTitle('Lumina Payment API')
      .setDescription('Test API documentation')
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
      .addTag('payments', 'Payment operations')
      .addServer('http://localhost:4000', 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('OpenAPI JSON endpoint', () => {
    it('should serve the OpenAPI JSON spec at /api/docs-json', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      expect(spec).toBeDefined();
      expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
      expect(spec.info.title).toBe('Lumina Payment API');
      expect(spec.info.version).toBe('1.0');
    });

    it('should include all registered paths', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it('should include security schemes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.['JWT-auth']).toBeDefined();
    });

    it('should include server definitions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      expect(spec.servers).toBeDefined();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0].url).toBe('http://localhost:4000');
    });

    it('should include tag definitions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      expect(spec.tags).toBeDefined();
      expect(spec.tags.length).toBeGreaterThan(0);
    });
  });

  describe('Swagger UI endpoint', () => {
    it('should serve Swagger UI at /api/docs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
    });
  });

  describe('OpenAPI spec content', () => {
    it('should include payment endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      const paths = Object.keys(spec.paths);
      const hasPayments = paths.some(p => p.includes('payments'));
      expect(hasPayments).toBe(true);
    });

    it('should include auth endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      const paths = Object.keys(spec.paths);
      const hasAuth = paths.some(p => p.includes('auth'));
      expect(hasAuth).toBe(true);
    });

    it('should have operation summaries on endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const spec = response.body;
      let hasSummary = false;
      for (const pathMethods of Object.values(spec.paths) as any[]) {
        for (const op of Object.values(pathMethods) as any[]) {
          if (op.summary) {
            hasSummary = true;
            break;
          }
        }
        if (hasSummary) break;
      }
      expect(hasSummary).toBe(true);
    });
  });
});
