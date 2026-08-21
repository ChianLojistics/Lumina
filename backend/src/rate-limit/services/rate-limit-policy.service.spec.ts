import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimitPolicyService, CreatePolicyDto, UpdatePolicyDto } from './rate-limit-policy.service';
import { RateLimitPolicyEntity } from '../entities/rate-limit-policy.entity';
import { RateLimitViolationEntity } from '../entities/rate-limit-violation.entity';
import { RateLimitAlgorithm } from '../entities/rate-limit-policy.entity';

describe('RateLimitPolicyService', () => {
  let service: RateLimitPolicyService;
  let policyRepository: Repository<RateLimitPolicyEntity>;
  let violationRepository: Repository<RateLimitViolationEntity>;

  const mockPolicyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockViolationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitPolicyService,
        {
          provide: getRepositoryToken(RateLimitPolicyEntity),
          useValue: mockPolicyRepository,
        },
        {
          provide: getRepositoryToken(RateLimitViolationEntity),
          useValue: mockViolationRepository,
        },
      ],
    }).compile();

    service = module.get<RateLimitPolicyService>(RateLimitPolicyService);
    policyRepository = module.get<Repository<RateLimitPolicyEntity>>(getRepositoryToken(RateLimitPolicyEntity));
    violationRepository = module.get<Repository<RateLimitViolationEntity>>(getRepositoryToken(RateLimitViolationEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPolicy', () => {
    it('should create a new policy', async () => {
      const dto: CreatePolicyDto = {
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
          endpoints: ['/api/*'],
        },
        actions: {
          throttle: true,
          challenge: false,
          block: false,
        },
      };

      const mockPolicy = {
        id: 'policy-1',
        ...dto,
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPolicyRepository.create.mockReturnValue(mockPolicy);
      mockPolicyRepository.save.mockResolvedValue(mockPolicy);

      const result = await service.createPolicy(dto);

      expect(result).toEqual(mockPolicy);
      expect(mockPolicyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          algorithm: dto.algorithm,
        }),
      );
      expect(mockPolicyRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAllPolicies', () => {
    it('should return all policies', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          name: 'Policy 1',
          algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
          config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
          scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
          actions: { throttle: true, challenge: false, block: false },
          isActive: true,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPolicyRepository.find.mockResolvedValue(mockPolicies);

      const result = await service.getAllPolicies();

      expect(result).toEqual(mockPolicies);
      expect(mockPolicyRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { priority: 'DESC', createdAt: 'ASC' },
      });
    });

    it('should return only active policies when requested', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          name: 'Policy 1',
          algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
          config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
          scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
          actions: { throttle: true, challenge: false, block: false },
          isActive: true,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPolicyRepository.find.mockResolvedValue(mockPolicies);

      const result = await service.getAllPolicies(true);

      expect(result).toEqual(mockPolicies);
      expect(mockPolicyRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC', createdAt: 'ASC' },
      });
    });
  });

  describe('getPolicyById', () => {
    it('should return a policy by ID', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Policy 1',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
        scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
        actions: { throttle: true, challenge: false, block: false },
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);

      const result = await service.getPolicyById('policy-1');

      expect(result).toEqual(mockPolicy);
      expect(mockPolicyRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'policy-1' } as any,
      });
    });

    it('should throw NotFoundException when policy does not exist', async () => {
      mockPolicyRepository.findOne.mockResolvedValue(null);

      await expect(service.getPolicyById('non-existent')).rejects.toThrow('Policy with ID non-existent not found');
    });
  });

  describe('updatePolicy', () => {
    it('should update an existing policy', async () => {
      const existingPolicy = {
        id: 'policy-1',
        name: 'Old Name',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
        scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
        actions: { throttle: true, challenge: false, block: false },
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto: UpdatePolicyDto = {
        name: 'New Name',
      };

      mockPolicyRepository.findOne.mockResolvedValue(existingPolicy);
      mockPolicyRepository.save.mockResolvedValue({
        ...existingPolicy,
        name: 'New Name',
      });

      const result = await service.updatePolicy('policy-1', updateDto);

      expect(result.name).toBe('New Name');
      expect(mockPolicyRepository.save).toHaveBeenCalled();
    });
  });

  describe('deletePolicy', () => {
    it('should delete a policy', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Policy 1',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
        scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
        actions: { throttle: true, challenge: false, block: false },
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockPolicyRepository.remove.mockResolvedValue(mockPolicy);

      await service.deletePolicy('policy-1');

      expect(mockPolicyRepository.remove).toHaveBeenCalledWith(mockPolicy);
    });
  });

  describe('activatePolicy and deactivatePolicy', () => {
    it('should activate a policy', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Policy 1',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
        scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
        actions: { throttle: true, challenge: false, block: false },
        isActive: false,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockPolicyRepository.save.mockResolvedValue({
        ...mockPolicy,
        isActive: true,
      });

      const result = await service.activatePolicy('policy-1');

      expect(result.isActive).toBe(true);
    });

    it('should deactivate a policy', async () => {
      const mockPolicy = {
        id: 'policy-1',
        name: 'Policy 1',
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        config: { requestsPerSecond: 10, burstCapacity: 20, windowSize: 1 },
        scope: { users: ['all'], tiers: ['all'], endpoints: ['/api/*'] },
        actions: { throttle: true, challenge: false, block: false },
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPolicyRepository.findOne.mockResolvedValue(mockPolicy);
      mockPolicyRepository.save.mockResolvedValue({
        ...mockPolicy,
        isActive: false,
      });

      const result = await service.deactivatePolicy('policy-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('recordViolation', () => {
    it('should record a violation', async () => {
      const mockViolation = {
        id: 'violation-1',
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        endpoint: '/api/test',
        policyId: 'policy-1',
        actionTaken: 'throttle',
        metadata: null,
        violatedAt: new Date(),
      };

      mockViolationRepository.create.mockReturnValue(mockViolation);
      mockViolationRepository.save.mockResolvedValue(mockViolation);

      const result = await service.recordViolation(
        'user-1',
        '127.0.0.1',
        '/api/test',
        'policy-1',
        'throttle',
      );

      expect(result).toEqual(mockViolation);
      expect(mockViolationRepository.create).toHaveBeenCalled();
      expect(mockViolationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getViolations', () => {
    it('should return violations with filters', async () => {
      const mockViolations = [
        {
          id: 'violation-1',
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          endpoint: '/api/test',
          policyId: 'policy-1',
          actionTaken: 'throttle',
          violatedAt: new Date(),
        },
      ];

      mockViolationRepository.find.mockResolvedValue(mockViolations);

      const result = await service.getViolations('user-1', '127.0.0.1', '/api/test', 10);

      expect(result).toEqual(mockViolations);
      expect(mockViolationRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          endpoint: '/api/test',
        },
        order: { violatedAt: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getViolationStats', () => {
    it('should return violation statistics', async () => {
      const mockViolations = [
        {
          id: 'violation-1',
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          endpoint: '/api/test',
          policyId: 'policy-1',
          actionTaken: 'throttle',
          violatedAt: new Date(),
        },
        {
          id: 'violation-2',
          userId: 'user-2',
          ipAddress: '127.0.0.2',
          endpoint: '/api/test',
          policyId: 'policy-1',
          actionTaken: 'block',
          violatedAt: new Date(),
        },
      ];

      mockViolationRepository.find.mockResolvedValue(mockViolations);

      const result = await service.getViolationStats(30);

      expect(result.totalViolations).toBe(2);
      expect(result.violationsByEndpoint).toEqual({
        '/api/test': 2,
      });
      expect(result.violationsByAction).toEqual({
        throttle: 1,
        block: 1,
      });
      expect(result.topViolators).toHaveLength(2);
    });
  });
});
