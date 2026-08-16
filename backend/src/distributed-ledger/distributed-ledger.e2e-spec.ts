/// <reference types="@types/jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributedLedgerModule } from './distributed-ledger.module';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ReconciliationReport } from './entities/reconciliation-report.entity';

describe('Distributed Ledger (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [LedgerEntry, ReconciliationReport],
          synchronize: true,
          logging: false,
        }),
        DistributedLedgerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/ledger/write (POST)', () => {
    it('should write entry to ledger', () => {
      const dto = {
        service: 'payment',
        operation: 'create',
        transactionId: 'tx-test-123',
        data: { amount: 100, currency: 'USD' },
        consistencyLevel: 'eventual',
      };

      return request(app.getHttpServer())
        .post('/api/ledger/write')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('entryId');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body.service).toBe(dto.service);
          expect(res.body.operation).toBe(dto.operation);
          expect(res.body.transactionId).toBe(dto.transactionId);
          expect(res.body.data).toEqual(dto.data);
        });
    });

    it('should reject invalid DTO', () => {
      const invalidDto = {
        service: 'payment',
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/api/ledger/write')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/api/ledger/:id (GET)', () => {
    let entryId: string;

    beforeEach(async () => {
      const dto = {
        service: 'payment',
        operation: 'create',
        transactionId: 'tx-test-456',
        data: { amount: 200 },
      };

      const response = await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send(dto);

      entryId = response.body.entryId;
    });

    it('should get entry by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/ledger/${entryId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.entryId).toBe(entryId);
        });
    });

    it('should return 404 for non-existent entry', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/non-existent-id')
        .expect(404);
    });
  });

  describe('/api/ledger/transactions/:txId (GET)', () => {
    const transactionId = 'tx-test-789';

    beforeEach(async () => {
      // Write multiple entries for the same transaction
      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'payment',
          operation: 'create',
          transactionId,
          data: { amount: 100 },
        });

      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'ramp',
          operation: 'create',
          transactionId,
          data: { amount: 100 },
        });
    });

    it('should get all entries for a transaction', () => {
      return request(app.getHttpServer())
        .get(`/api/ledger/transactions/${transactionId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          res.body.forEach((entry: any) => {
            expect(entry.transactionId).toBe(transactionId);
          });
        });
    });
  });

  describe('/api/ledger/query (GET)', () => {
    beforeEach(async () => {
      // Write test entries
      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'payment',
          operation: 'create',
          transactionId: 'tx-query-1',
          data: { amount: 100 },
        });

      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'ramp',
          operation: 'create',
          transactionId: 'tx-query-2',
          data: { amount: 200 },
        });
    });

    it('should query ledger with service filter', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/query?service=payment')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('entries');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.entries)).toBe(true);
          res.body.entries.forEach((entry: any) => {
            expect(entry.service).toBe('payment');
          });
        });
    });

    it('should query ledger with transaction filter', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/query?transactionId=tx-query-1')
        .expect(200)
        .expect((res) => {
          expect(res.body.entries).toHaveLength(1);
          expect(res.body.entries[0].transactionId).toBe('tx-query-1');
        });
    });

    it('should apply pagination', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/query?limit=1&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.entries.length).toBeLessThanOrEqual(1);
        });
    });
  });

  describe('/api/ledger/health (GET)', () => {
    it('should return ledger health status', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('nodes');
          expect(res.body).toHaveProperty('leader');
          expect(res.body).toHaveProperty('consensusReached');
          expect(res.body).toHaveProperty('storageSize');
          expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status);
        });
    });
  });

  describe('/api/ledger/statistics (GET)', () => {
    it('should return ledger statistics', () => {
      return request(app.getHttpServer())
        .get('/api/ledger/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalEntries');
          expect(res.body).toHaveProperty('entriesByService');
          expect(Array.isArray(res.body.entriesByService)).toBe(true);
        });
    });
  });

  describe('/api/ledger/reconcile (POST)', () => {
    it('should trigger reconciliation', () => {
      const dto = {
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date().toISOString(),
      };

      return request(app.getHttpServer())
        .post('/api/ledger/reconcile')
        .send(dto)
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('startTime');
          expect(res.body).toHaveProperty('endTime');
          expect(res.body).toHaveProperty('conflictsDetected');
          expect(res.body).toHaveProperty('conflictsResolved');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should reject invalid time range', () => {
      const invalidDto = {
        startTime: 'invalid-date',
        endTime: new Date().toISOString(),
      };

      return request(app.getHttpServer())
        .post('/api/ledger/reconcile')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/api/ledger/:id/verify (GET)', () => {
    let entryId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'payment',
          operation: 'create',
          transactionId: 'tx-verify-1',
          data: { amount: 100 },
        });

      entryId = response.body.entryId;
    });

    it('should verify entry integrity', () => {
      return request(app.getHttpServer())
        .get(`/api/ledger/${entryId}/verify`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('valid');
          expect(typeof res.body.valid).toBe('boolean');
        });
    });
  });

  describe('/api/ledger/write/batch (POST)', () => {
    it('should batch write entries', () => {
      const dtos = [
        {
          service: 'payment',
          operation: 'create',
          transactionId: 'tx-batch-1',
          data: { amount: 100 },
        },
        {
          service: 'ramp',
          operation: 'create',
          transactionId: 'tx-batch-2',
          data: { amount: 200 },
        },
      ];

      return request(app.getHttpServer())
        .post('/api/ledger/write/batch')
        .send(dtos)
        .expect(201)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
        });
    });
  });

  describe('Integration: Write -> Query -> Verify flow', () => {
    it('should complete full workflow', async () => {
      // Step 1: Write entry
      const writeResponse = await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'payment',
          operation: 'create',
          transactionId: 'tx-integration-1',
          data: { amount: 500, currency: 'USD' },
        })
        .expect(201);

      const entryId = writeResponse.body.entryId;

      // Step 2: Query entry
      const queryResponse = await request(app.getHttpServer())
        .get(`/api/ledger/${entryId}`)
        .expect(200);

      expect(queryResponse.body.entryId).toBe(entryId);

      // Step 3: Verify entry
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/ledger/${entryId}/verify`)
        .expect(200);

      expect(verifyResponse.body.valid).toBe(true);

      // Step 4: Query by transaction
      const txQueryResponse = await request(app.getHttpServer())
        .get(`/api/ledger/transactions/tx-integration-1`)
        .expect(200);

      expect(txQueryResponse.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration: Reconciliation flow', () => {
    it('should write entries and reconcile', async () => {
      // Write entries for reconciliation
      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'payment',
          operation: 'create',
          transactionId: 'tx-recon-1',
          data: { amount: 100 },
        });

      await request(app.getHttpServer())
        .post('/api/ledger/write')
        .send({
          service: 'ramp',
          operation: 'create',
          transactionId: 'tx-recon-1',
          data: { amount: 100 },
        });

      // Trigger reconciliation
      const reconResponse = await request(app.getHttpServer())
        .post('/api/ledger/reconcile')
        .send({
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString(),
        })
        .expect(202);

      expect(reconResponse.body).toHaveProperty('id');
      expect(reconResponse.body).toHaveProperty('conflictsDetected');
      expect(reconResponse.body).toHaveProperty('conflictsResolved');
    });
  });
});
