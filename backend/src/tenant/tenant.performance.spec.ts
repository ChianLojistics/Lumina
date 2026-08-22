import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';
import { TenantUsage } from './entities/tenant-usage.entity';

describe('TenantService Performance Tests', () => {
  let service: TenantService;
  let tenantRepository: Repository<Tenant>;
  let tenantUsageRepository: Repository<TenantUsage>;

  const mockTenantRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockTenantUsageRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(TenantUsage),
          useValue: mockTenantUsageRepository,
        },
        {
          provide: getRepositoryToken('TenantUser'),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken('TenantAudit'),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    tenantUsageRepository = module.get<Repository<TenantUsage>>(getRepositoryToken(TenantUsage));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent tenant lookups', () => {
    it('should handle 100 concurrent tenant lookups efficiently', async () => {
      const mockTenant = {
        id: '123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        branding_config: {},
        quota_config: {},
        feature_config: {},
        status: 'active',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, (_, i) =>
        service.findOne(`tenant-${i}`),
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(mockTenantRepository.findOne).toHaveBeenCalledTimes(100);
    });
  });

  describe('Quota checking performance', () => {
    it('should handle 1000 quota checks efficiently', async () => {
      const mockTenant = {
        id: '123',
        quota_config: {
          apiCalls: { daily: 10000, hourly: 1000 },
        },
      };

      const mockUsage = {
        hourly_count: 100,
        daily_count: 1000,
        hourly_reset_at: new Date(),
        daily_reset_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantUsageRepository.findOne.mockResolvedValue(mockUsage);

      const startTime = Date.now();
      const promises = Array.from({ length: 1000 }, () =>
        service.checkQuota('123', 'api_calls' as any),
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.every(r => r === true)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe('Multi-tenant data isolation', () => {
    it('should ensure no cross-tenant data access', async () => {
      const tenants = Array.from({ length: 10 }, (_, i) => ({
        id: `tenant-${i}`,
        name: `Tenant ${i}`,
        slug: `tenant-${i}`,
        branding_config: {},
        quota_config: {},
        feature_config: {},
        status: 'active',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockTenantRepository.findOne.mockImplementation(({ where }) => {
        const tenant = tenants.find(t => t.id === where.id);
        return Promise.resolve(tenant || null);
      });

      const startTime = Date.now();
      const promises = tenants.map(tenant => service.findOne(tenant.id));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.id).toBe(`tenant-${index}`);
      });
      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
    });
  });

  describe('Usage recording performance', () => {
    it('should handle 1000 usage recording operations efficiently', async () => {
      const mockUsage = {
        tenant_id: '123',
        resource_type: 'api_calls',
        hourly_count: 100,
        daily_count: 1000,
        monthly_count: 10000,
        total_count: 100000,
        current_value: 0,
        hourly_reset_at: new Date(),
        daily_reset_at: new Date(),
        monthly_reset_at: new Date(),
      };

      mockTenantUsageRepository.findOne.mockResolvedValue(mockUsage);
      mockTenantUsageRepository.save.mockResolvedValue(mockUsage);

      const startTime = Date.now();
      const promises = Array.from({ length: 1000 }, () =>
        service.recordUsage('123', 'api_calls' as any, 1),
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(mockTenantUsageRepository.save).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(3000); // Should complete in less than 3 seconds
    });
  });

  describe('Memory efficiency', () => {
    it('should not leak memory during repeated operations', async () => {
      const mockTenant = {
        id: '123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        branding_config: {},
        quota_config: {},
        feature_config: {},
        status: 'active',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 1000 operations
      for (let i = 0; i < 1000; i++) {
        await service.findOne('123');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be less than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Tenant identification performance', () => {
    it('should identify tenant from subdomain quickly', async () => {
      const mockTenant = {
        id: '123',
        name: 'Test Tenant',
        slug: 'test-tenant',
        branding_config: {},
        quota_config: {},
        feature_config: {},
        status: 'active',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockTenantService = {
        findBySlug: jest.fn().mockResolvedValue(mockTenant),
        findByDomain: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(mockTenant),
      };

      const { TenantMiddleware } = require('./middleware/tenant.middleware');
      const middleware = new TenantMiddleware(mockTenantService);

      const req = {
        hostname: 'test-tenant.example.com',
        headers: {},
        params: {},
        query: {},
      };

      const startTime = Date.now();
      await (middleware as any).identifyTenant(req);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });
});
