import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';
import { TenantUser } from './entities/tenant-user.entity';
import { TenantUsage } from './entities/tenant-usage.entity';
import { TenantAudit } from './entities/tenant-audit.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepository: Repository<Tenant>;
  let tenantUserRepository: Repository<TenantUser>;
  let tenantUsageRepository: Repository<TenantUsage>;
  let tenantAuditRepository: Repository<TenantAudit>;

  const mockTenantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockTenantUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTenantUsageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTenantAuditRepository = {
    create: jest.fn(),
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
          provide: getRepositoryToken(TenantUser),
          useValue: mockTenantUserRepository,
        },
        {
          provide: getRepositoryToken(TenantUsage),
          useValue: mockTenantUsageRepository,
        },
        {
          provide: getRepositoryToken(TenantAudit),
          useValue: mockTenantAuditRepository,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    tenantUserRepository = module.get<Repository<TenantUser>>(getRepositoryToken(TenantUser));
    tenantUsageRepository = module.get<Repository<TenantUsage>>(getRepositoryToken(TenantUsage));
    tenantAuditRepository = module.get<Repository<TenantAudit>>(getRepositoryToken(TenantAudit));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      const createTenantDto = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        admin_email: 'admin@test.com',
      };

      const mockTenant = {
        id: '123',
        ...createTenantDto,
        branding_config: {},
        quota_config: {},
        feature_config: {},
        status: 'trial',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);
      mockTenantUsageRepository.create.mockReturnValue({});
      mockTenantUsageRepository.save.mockResolvedValue({});
      mockTenantAuditRepository.create.mockReturnValue({});
      mockTenantAuditRepository.save.mockResolvedValue({});

      const result = await service.create(createTenantDto, 'user-123');

      expect(result).toEqual(mockTenant);
      expect(mockTenantRepository.findOne).toHaveBeenCalled();
      expect(mockTenantRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if tenant exists', async () => {
      const createTenantDto = {
        name: 'Test Tenant',
        slug: 'test-tenant',
      };

      mockTenantRepository.findOne.mockResolvedValue({ id: '123' });

      await expect(service.create(createTenantDto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a tenant by id', async () => {
      const mockTenant = {
        id: '123',
        name: 'Test Tenant',
        slug: 'test-tenant',
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);

      const result = await service.findOne('123');

      expect(result).toEqual(mockTenant);
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return a tenant by slug', async () => {
      const mockTenant = {
        id: '123',
        name: 'Test Tenant',
        slug: 'test-tenant',
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);

      const result = await service.findBySlug('test-tenant');

      expect(result).toEqual(mockTenant);
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({ where: { slug: 'test-tenant' } });
    });

    it('should return null if tenant not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('checkQuota', () => {
    it('should return true when quota is not exceeded', async () => {
      const mockTenant = {
        id: '123',
        quota_config: {
          apiCalls: { daily: 1000, hourly: 100 },
        },
      };

      const mockUsage = {
        hourly_count: 50,
        daily_count: 500,
        hourly_reset_at: new Date(),
        daily_reset_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantUsageRepository.findOne.mockResolvedValue(mockUsage);

      const result = await service.checkQuota('123', 'api_calls' as any);

      expect(result).toBe(true);
    });

    it('should return false when hourly quota is exceeded', async () => {
      const mockTenant = {
        id: '123',
        quota_config: {
          apiCalls: { daily: 1000, hourly: 100 },
        },
      };

      const mockUsage = {
        hourly_count: 100,
        daily_count: 500,
        hourly_reset_at: new Date(),
        daily_reset_at: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantUsageRepository.findOne.mockResolvedValue(mockUsage);

      const result = await service.checkQuota('123', 'api_calls' as any);

      expect(result).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should record usage and update counters', async () => {
      const mockUsage = {
        tenant_id: '123',
        resource_type: 'api_calls',
        hourly_count: 50,
        daily_count: 500,
        monthly_count: 1000,
        total_count: 10000,
        current_value: 0,
        hourly_reset_at: new Date(),
        daily_reset_at: new Date(),
        monthly_reset_at: new Date(),
      };

      mockTenantUsageRepository.findOne.mockResolvedValue(mockUsage);
      mockTenantUsageRepository.save.mockResolvedValue(mockUsage);

      await service.recordUsage('123', 'api_calls' as any, 10);

      expect(mockTenantUsageRepository.save).toHaveBeenCalled();
    });
  });
});
