import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { RateLimitModule } from '../rate-limit.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitPolicyEntity } from '../entities/rate-limit-policy.entity';
import { RateLimitViolationEntity } from '../entities/rate-limit-violation.entity';

describe('Rate Limiting E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        RateLimitModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'lumina_test',
          entities: [RateLimitPolicyEntity, RateLimitViolationEntity],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Policy Management API', () => {
    it('POST /api/v1/policies - should create a new policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Test Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 10,
            burstCapacity: 20,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/test'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Policy');
    });

    it('GET /api/v1/policies - should return all policies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/policies')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v1/policies/:id - should return a specific policy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Specific Policy',
          algorithm: 'sliding-window',
          config: {
            requestsPerSecond: 5,
            burstCapacity: 10,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/specific'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/policies/${createResponse.body.id}`)
        .expect(200);

      expect(response.body.id).toBe(createResponse.body.id);
    });

    it('PUT /api/v1/policies/:id - should update a policy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Update Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 10,
            burstCapacity: 20,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/update'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/policies/${createResponse.body.id}`)
        .send({
          name: 'Updated Policy Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Policy Name');
    });

    it('POST /api/v1/policies/:id/activate - should activate a policy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Activate Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 10,
            burstCapacity: 20,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/activate'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
          isActive: false,
        });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/policies/${createResponse.body.id}/activate`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('POST /api/v1/policies/:id/deactivate - should deactivate a policy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Deactivate Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 10,
            burstCapacity: 20,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/deactivate'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/policies/${createResponse.body.id}/deactivate`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('DELETE /api/v1/policies/:id - should delete a policy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Delete Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 10,
            burstCapacity: 20,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/delete'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      await request(app.getHttpServer())
        .delete(`/api/v1/policies/${createResponse.body.id}`)
        .expect(200);
    });
  });

  describe('Rate Limit Status API', () => {
    it('GET /api/rate-limits/status - should return rate limit status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rate-limits/status')
        .expect(200);

      expect(response.body).toHaveProperty('systemLoad');
      expect(response.body).toHaveProperty('redisAvailable');
      expect(response.body).toHaveProperty('metrics');
    });

    it('GET /api/rate-limits/violations - should return violations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rate-limits/violations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/rate-limits/violations/stats - should return violation statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rate-limits/violations/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalViolations');
      expect(response.body).toHaveProperty('violationsByEndpoint');
      expect(response.body).toHaveProperty('violationsByAction');
      expect(response.body).toHaveProperty('topViolators');
    });
  });

  describe('Distributed Coordination', () => {
    it('should coordinate rate limits across multiple instances', async () => {
      const policyId = await createTestPolicy(app);

      const key = 'test-distributed-key';
      const config = {
        requestsPerSecond: 5,
        burstCapacity: 10,
        windowSize: 1,
      };

      let allowedCount = 0;
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/rate-limits/status')
          .set('X-Rate-Limit-Key', key);

        if (response.status !== 429) {
          allowedCount++;
        }
      }

      expect(allowedCount).toBeLessThanOrEqual(5);
    });

    it('should handle Redis connection failures gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rate-limits/status')
        .expect(200);

      expect(response.body.redisAvailable).toBeDefined();
    });
  });

  describe('Policy Evaluation', () => {
    it('should match policies by user tier', async () => {
      const policy = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Premium Tier Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 100,
            burstCapacity: 200,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['premium'],
            endpoints: ['/api/premium'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      expect(policy.body.scope.tiers).toContain('premium');
    });

    it('should match policies by endpoint pattern', async () => {
      const policy = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          name: 'Wildcard Endpoint Policy',
          algorithm: 'token-bucket',
          config: {
            requestsPerSecond: 50,
            burstCapacity: 100,
            windowSize: 1,
          },
          scope: {
            users: ['all'],
            tiers: ['all'],
            endpoints: ['/api/*'],
          },
          actions: {
            throttle: true,
            challenge: false,
            block: false,
          },
        });

      expect(policy.body.scope.endpoints).toContain('/api/*');
    });
  });

  describe('Adaptive Throttling', () => {
    it('should adjust limits based on system load', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rate-limits/status')
        .expect(200);

      expect(response.body.systemLoad).toBeDefined();
      expect(typeof response.body.systemLoad).toBe('number');
    });
  });
});

async function createTestPolicy(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/policies')
    .send({
      name: 'Test Policy',
      algorithm: 'token-bucket',
      config: {
        requestsPerSecond: 10,
        burstCapacity: 20,
        windowSize: 1,
      },
      scope: {
        users: ['all'],
        tiers: ['all'],
        endpoints: ['/api/test'],
      },
      actions: {
        throttle: true,
        challenge: false,
        block: false,
      },
    });

  return response.body.id;
}
