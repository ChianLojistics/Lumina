import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsCacheService } from './analytics-cache.service';
import Redis from 'ioredis';

describe('AnalyticsCacheService', () => {
  let service: AnalyticsCacheService;
  let redis: Redis;

  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsCacheService,
        {
          provide: 'Redis',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AnalyticsCacheService>(AnalyticsCacheService);
    redis = module.get<Redis>('Redis');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached data', async () => {
      const mockData = { total: 1000, growth: 10 };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get('merchant-1', 'metrics', { timeRange: '7d' });

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith('analytics:merchant-1:metrics:timeRange:7d');
    });

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('merchant-1', 'metrics');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('merchant-1', 'metrics');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data with TTL', async () => {
      const mockData = { total: 1000 };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('merchant-1', 'metrics', mockData, {}, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'analytics:merchant-1:metrics',
        300,
        JSON.stringify(mockData)
      );
    });

    it('should handle cache set errors gracefully', async () => {
      const mockData = { total: 1000 };
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('merchant-1', 'metrics', mockData)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache type', async () => {
      mockRedis.keys.mockResolvedValue(['analytics:merchant-1:metrics:timeRange:7d', 'analytics:merchant-1:metrics:timeRange:30d']);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidate('merchant-1', 'metrics');

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:merchant-1:metrics*');
      expect(mockRedis.del).toHaveBeenCalledWith('analytics:merchant-1:metrics:timeRange:7d', 'analytics:merchant-1:metrics:timeRange:30d');
    });

    it('should invalidate all merchant cache when type not specified', async () => {
      mockRedis.keys.mockResolvedValue(['analytics:merchant-1:metrics:*', 'analytics:merchant-1:customers']);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidate('merchant-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:merchant-1:*');
    });

    it('should handle empty key list', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.invalidate('merchant-1', 'metrics');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate cache by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['analytics:merchant-1:metrics:*', 'analytics:merchant-2:metrics:*']);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidatePattern('analytics:*:metrics*');

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:*:metrics*');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should call get with correct parameters', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.getMetrics('merchant-1', '7d');

      expect(mockRedis.get).toHaveBeenCalledWith('analytics:merchant-1:metrics:timeRange:7d');
    });
  });

  describe('setMetrics', () => {
    it('should call set with correct TTL', async () => {
      const mockData = { total: 1000 };
      mockRedis.setex.mockResolvedValue('OK');

      await service.setMetrics('merchant-1', '7d', mockData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        300,
        JSON.stringify(mockData)
      );
    });
  });

  describe('getForecast', () => {
    it('should call get with scenario and days parameters', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.getForecast('merchant-1', 'optimistic', 30);

      expect(mockRedis.get).toHaveBeenCalledWith('analytics:merchant-1:forecast:scenario:optimistic|days:30');
    });
  });

  describe('setForecast', () => {
    it('should call set with longer TTL for forecasts', async () => {
      const mockData = { totalPredicted: 10000 };
      mockRedis.setex.mockResolvedValue('OK');

      await service.setForecast('merchant-1', 'baseline', 30, mockData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600,
        JSON.stringify(mockData)
      );
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should call get without additional parameters', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.getCustomerAnalytics('merchant-1');

      expect(mockRedis.get).toHaveBeenCalledWith('analytics:merchant-1:customers');
    });
  });

  describe('setCustomerAnalytics', () => {
    it('should call set with correct TTL', async () => {
      const mockData = { totalCustomers: 100 };
      mockRedis.setex.mockResolvedValue('OK');

      await service.setCustomerAnalytics('merchant-1', mockData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'analytics:merchant-1:customers',
        600,
        JSON.stringify(mockData)
      );
    });
  });
});
