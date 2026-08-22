import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';
import { NotFoundException } from '@nestjs/common';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let tenantService: TenantService;

  const mockTenantService = {
    findBySlug: jest.fn(),
    findByDomain: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTenant: Tenant = {
    id: '123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    domain: 'test.example.com',
    branding_config: {},
    quota_config: {},
    feature_config: {},
    status: 'active' as any,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    tenantService = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('identifyTenant from subdomain', () => {
    it('should identify tenant from subdomain', async () => {
      const req = {
        hostname: 'test-tenant.example.com',
        headers: {},
        params: {},
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findBySlug).toHaveBeenCalledWith('test-tenant');
    });

    it('should skip www subdomain', async () => {
      const req = {
        hostname: 'www.example.com',
        headers: {},
        params: {},
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(null);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toBeNull();
    });
  });

  describe('identifyTenant from custom domain', () => {
    it('should identify tenant from custom domain', async () => {
      const req = {
        hostname: 'test.example.com',
        headers: {},
        params: {},
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findByDomain).toHaveBeenCalledWith('test.example.com');
    });
  });

  describe('identifyTenant from header', () => {
    it('should identify tenant from X-Tenant-ID header', async () => {
      const req = {
        hostname: 'example.com',
        headers: {
          'x-tenant-id': '123',
        },
        params: {},
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(null);
      mockTenantService.findOne.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findOne).toHaveBeenCalledWith('123');
    });

    it('should identify tenant from X-Tenant-Slug header', async () => {
      const req = {
        hostname: 'example.com',
        headers: {
          'x-tenant-slug': 'test-tenant',
        },
        params: {},
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(null);
      mockTenantService.findOne.mockResolvedValue(null);
      mockTenantService.findBySlug.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findBySlug).toHaveBeenCalledWith('test-tenant');
    });
  });

  describe('identifyTenant from path parameter', () => {
    it('should identify tenant from path parameter', async () => {
      const req = {
        hostname: 'example.com',
        headers: {},
        params: {
          tenantId: '123',
        },
        query: {},
      };

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(null);
      mockTenantService.findOne.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findOne).toHaveBeenCalledWith('123');
    });
  });

  describe('identifyTenant from query parameter', () => {
    it('should identify tenant from query parameter', async () => {
      const req = {
        hostname: 'example.com',
        headers: {},
        params: {},
        query: {
          tenantId: '123',
        },
      };

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(null);
      mockTenantService.findOne.mockResolvedValue(mockTenant);

      const tenant = await (middleware as any).identifyTenant(req);

      expect(tenant).toEqual(mockTenant);
      expect(mockTenantService.findOne).toHaveBeenCalledWith('123');
    });
  });

  describe('middleware use', () => {
    it('should set tenant in request and call next', async () => {
      const req = {
        hostname: 'test-tenant.example.com',
        headers: {},
        params: {},
        query: {},
      };
      const res = {};
      const next = jest.fn();

      mockTenantService.findBySlug.mockResolvedValue(mockTenant);

      await middleware.use(req as any, res as any, next);

      expect(req.tenant).toEqual(mockTenant);
      expect(req.tenantId).toBe('123');
      expect(next).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tenant not found', async () => {
      const req = {
        hostname: 'example.com',
        headers: {},
        params: {},
        query: {},
      };
      const res = {};
      const next = jest.fn();

      mockTenantService.findBySlug.mockResolvedValue(null);
      mockTenantService.findByDomain.mockResolvedValue(null);
      mockTenantService.findOne.mockResolvedValue(null);

      await expect(middleware.use(req as any, res as any, next)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if tenant is not active', async () => {
      const inactiveTenant = { ...mockTenant, is_active: false, status: 'suspended' };
      const req = {
        hostname: 'test-tenant.example.com',
        headers: {},
        params: {},
        query: {},
      };
      const res = {};
      const next = jest.fn();

      mockTenantService.findBySlug.mockResolvedValue(inactiveTenant);

      await expect(middleware.use(req as any, res as any, next)).rejects.toThrow();
    });
  });
});
