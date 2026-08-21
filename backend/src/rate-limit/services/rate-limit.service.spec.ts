import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RateLimitPolicyService } from './rate-limit-policy.service';
import { RateLimitAlgorithmService } from './rate-limit-algorithm.service';
import { RateLimitAlgorithm } from '../entities/rate-limit-policy.entity';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let policyService: RateLimitPolicyService;
  let algorithmService: RateLimitAlgorithmService;

  const mockPolicyService = {
    getActivePolicies: jest.fn(),
    recordViolation: jest.fn(),
  };

  const mockAlgorithmService = {
    checkLimit: jest.fn(),
    resetLimit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: RateLimitPolicyService,
          useValue: mockPolicyService,
        },
        {
          provide: RateLimitAlgorithmService,
          useValue: mockAlgorithmService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    policyService = module.get<RateLimitPolicyService>(RateLimitPolicyService);
    algorithmService = module.get<RateLimitAlgorithmService>(RateLimitAlgorithmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Admin Bypass', () => {
    it('should allow admin users without rate limiting', async () => {
      const context = {
        userId: 'admin-user',
        userTier: 'premium',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        isAdmin: true,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
      expect(mockAlgorithmService.checkLimit).not.toHaveBeenCalled();
    });
  });

  describe('Policy Matching', () => {
    it('should use matching policy for rate limiting', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Test Policy',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
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
        conditions: {},
        actions: {
          throttle: true,
          challenge: false,
          block: false,
        },
        isActive: true,
        priority: 0,
      };

      mockPolicyService.getActivePolicies.mockResolvedValue([mockPolicy]);
      mockAlgorithmService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: Date.now() + 1000,
        limit: 10,
      });

      const context = {
        userId: 'user-1',
        userTier: 'basic',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        isAdmin: false,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('policy-1');
      expect(mockAlgorithmService.checkLimit).toHaveBeenCalled();
    });

    it('should allow requests when no policy matches', async () => {
      mockPolicyService.getActivePolicies.mockResolvedValue([]);

      const context = {
        userId: 'user-1',
        userTier: 'basic',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        isAdmin: false,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
      expect(mockAlgorithmService.checkLimit).not.toHaveBeenCalled();
    });
  });

  describe('Adaptive Throttling', () => {
    it('should adjust limits based on system load', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Test Policy',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: {
          requestsPerSecond: 100,
          burstCapacity: 200,
          windowSize: 1,
        },
        scope: {
          users: ['all'],
          tiers: ['all'],
          endpoints: ['/api/test'],
        },
        conditions: {
          systemLoad: 80,
        },
        actions: {
          throttle: true,
          challenge: false,
          block: false,
        },
        isActive: true,
        priority: 0,
      };

      mockPolicyService.getActivePolicies.mockResolvedValue([mockPolicy]);
      mockAlgorithmService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 50,
        reset: Date.now() + 1000,
        limit: 50,
      });

      service.updateSystemLoad(90);

      const context = {
        userId: 'user-1',
        userTier: 'basic',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        isAdmin: false,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(true);
      expect(mockAlgorithmService.checkLimit).toHaveBeenCalledWith(
        expect.any(String),
        RateLimitAlgorithm.TOKEN_BUCKET,
        expect.objectContaining({
          requestsPerSecond: expect.any(Number),
        }),
      );
    });
  });

  describe('Violation Recording', () => {
    it('should record violations when rate limit is exceeded', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Test Policy',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
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
        conditions: {},
        actions: {
          throttle: true,
          challenge: false,
          block: false,
        },
        isActive: true,
        priority: 0,
      };

      mockPolicyService.getActivePolicies.mockResolvedValue([mockPolicy]);
      mockAlgorithmService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now() + 1000,
        limit: 10,
        retryAfter: 60,
      });

      const context = {
        userId: 'user-1',
        userTier: 'basic',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        isAdmin: false,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(false);
      expect(result.actionTaken).toBe('throttle');
      expect(mockPolicyService.recordViolation).toHaveBeenCalledWith(
        'user-1',
        '127.0.0.1',
        '/api/test',
        'policy-1',
        'throttle',
      );
    });
  });

  describe('System Load Management', () => {
    it('should update system load', () => {
      service.updateSystemLoad(75);
      expect(service.getSystemLoad()).toBe(75);
    });

    it('should clamp system load to valid range', () => {
      service.updateSystemLoad(150);
      expect(service.getSystemLoad()).toBe(100);

      service.updateSystemLoad(-50);
      expect(service.getSystemLoad()).toBe(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit for a user', async () => {
      const context = {
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
      };

      await service.resetRateLimit(context.userId, context.ipAddress, context.endpoint);

      expect(mockAlgorithmService.resetLimit).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
      );
    });
  });

  describe('Endpoint Pattern Matching', () => {
    it('should match wildcard patterns', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Wildcard Policy',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: {
          requestsPerSecond: 10,
          burstCapacity: 20,
          windowSize: 1,
        },
        scope: {
          users: ['all'],
          tiers: ['all'],
          endpoints: ['/api/*'],
        },
        conditions: {},
        actions: {
          throttle: true,
          challenge: false,
          block: false,
        },
        isActive: true,
        priority: 0,
      };

      mockPolicyService.getActivePolicies.mockResolvedValue([mockPolicy]);
      mockAlgorithmService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: Date.now() + 1000,
        limit: 10,
      });

      const context = {
        userId: 'user-1',
        endpoint: '/api/test',
        isAdmin: false,
      };

      const result = await service.checkRateLimit(context);

      expect(result.allowed).toBe(true);
      expect(result.policyId).toBe('policy-1');
    });
  });
});
