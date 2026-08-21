import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { RevenueForecast } from './entities/revenue-forecast.entity';
import { CustomerAnalytics } from './entities/customer-analytics.entity';
import { CustomReport } from './entities/custom-report.entity';
import { TimeRange } from './dto/metrics.dto';
import { ForecastScenario } from './dto/forecast.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let metricsRepository: Repository<AnalyticsMetric>;
  let cacheService: AnalyticsCacheService;

  const mockMetricsRepository = {
    find: jest.fn(),
  };

  const mockCacheService = {
    getMetrics: jest.fn(),
    setMetrics: jest.fn(),
    getForecast: jest.fn(),
    setForecast: jest.fn(),
    getCustomerAnalytics: jest.fn(),
    setCustomerAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnalyticsMetric),
          useValue: mockMetricsRepository,
        },
        {
          provide: getRepositoryToken(RevenueForecast),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(CustomerAnalytics),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(CustomReport),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: AnalyticsCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    metricsRepository = module.get<Repository<AnalyticsMetric>>(getRepositoryToken(AnalyticsMetric));
    cacheService = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedData = {
        cards: [{ name: 'Revenue', value: 1000, change: 10, changePeriod: 'last period', trend: 'up' as const }],
        revenue: { total: 1000, growth: 10, data: [] },
        paymentMethods: [],
        geographic: [],
      };

      mockCacheService.getMetrics.mockResolvedValue(cachedData);

      const result = await service.getMetrics('merchant-1', { timeRange: TimeRange.LAST_7D });

      expect(result).toEqual(cachedData);
      expect(cacheService.getMetrics).toHaveBeenCalledWith('merchant-1', TimeRange.LAST_7D);
      expect(metricsRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics when cache is empty', async () => {
      const mockMetrics = [
        {
          id: '1',
          merchantId: 'merchant-1',
          metricName: 'revenue',
          metricValue: 1000,
          timestamp: new Date(),
          dimensions: null,
        },
      ];

      mockCacheService.getMetrics.mockResolvedValue(null);
      mockMetricsRepository.find.mockResolvedValue(mockMetrics);
      mockCacheService.setMetrics.mockResolvedValue(undefined);

      const result = await service.getMetrics('merchant-1', { timeRange: TimeRange.LAST_7D });

      expect(metricsRepository.find).toHaveBeenCalled();
      expect(cacheService.setMetrics).toHaveBeenCalled();
      expect(result).toHaveProperty('cards');
      expect(result).toHaveProperty('revenue');
    });

    it('should calculate metric cards correctly', async () => {
      const currentMetrics = [
        { metricName: 'revenue', metricValue: 1100 },
        { metricName: 'transaction_volume', metricValue: 100 },
      ];

      const previousMetrics = [
        { metricName: 'revenue', metricValue: 1000 },
        { metricName: 'transaction_volume', metricValue: 90 },
      ];

      mockCacheService.getMetrics.mockResolvedValue(null);
      mockMetricsRepository.find.mockResolvedValueOnce(currentMetrics).mockResolvedValueOnce(previousMetrics);
      mockCacheService.setMetrics.mockResolvedValue(undefined);

      const result = await service.getMetrics('merchant-1', { timeRange: TimeRange.LAST_7D });

      expect(result.cards[0].change).toBeCloseTo(10);
      expect(result.cards[0].trend).toBe('up');
    });
  });

  describe('getForecast', () => {
    it('should return cached forecast if available', async () => {
      const cachedForecast = {
        totalPredicted: 10000,
        averageDaily: 333,
        growthRate: 5,
        confidence: 75,
        data: [],
      };

      mockCacheService.getForecast.mockResolvedValue(cachedForecast);

      const result = await service.getForecast('merchant-1', { scenario: ForecastScenario.BASELINE });

      expect(result).toEqual(cachedForecast);
      expect(cacheService.getForecast).toHaveBeenCalledWith('merchant-1', ForecastScenario.BASELINE, 30);
    });

    it('should generate mock forecast when no data exists', async () => {
      mockCacheService.getForecast.mockResolvedValue(null);
      mockCacheService.setForecast.mockResolvedValue(undefined);

      const result = await service.getForecast('merchant-1', { scenario: ForecastScenario.BASELINE });

      expect(result).toHaveProperty('totalPredicted');
      expect(result).toHaveProperty('data');
      expect(result.data.length).toBeGreaterThan(0);
      expect(cacheService.setForecast).toHaveBeenCalled();
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should return cached customer analytics if available', async () => {
      const cachedData = {
        totalCustomers: 100,
        activeCustomers: 68,
        newCustomers: 15,
        returningCustomers: 53,
        segments: [],
        cohorts: [],
        funnel: [],
      };

      mockCacheService.getCustomerAnalytics.mockResolvedValue(cachedData);

      const result = await service.getCustomerAnalytics('merchant-1');

      expect(result).toEqual(cachedData);
      expect(cacheService.getCustomerAnalytics).toHaveBeenCalledWith('merchant-1');
    });

    it('should calculate customer segments correctly', async () => {
      const mockCustomers = [
        { totalSpent: 6000, totalTransactions: 10, churnProbability: 0.1 },
        { totalSpent: 2500, totalTransactions: 5, churnProbability: 0.15 },
        { totalSpent: 500, totalTransactions: 2, churnProbability: 0.3 },
      ];

      mockCacheService.getCustomerAnalytics.mockResolvedValue(null);
      (service as any).customerAnalyticsRepository = { find: jest.fn().mockResolvedValue(mockCustomers) };
      mockCacheService.setCustomerAnalytics.mockResolvedValue(undefined);

      const result = await service.getCustomerAnalytics('merchant-1');

      expect(result.segments).toHaveLength(3);
      expect(result.segments[0].segment).toBe('high-value');
      expect(result.segments[0].count).toBe(1);
    });
  });

  describe('getDateRange', () => {
    it('should return correct range for 24h', () => {
      const range = (service as any).getDateRange(TimeRange.LAST_24H);
      const diff = range.end.getTime() - range.start.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    });

    it('should return correct range for 7d', () => {
      const range = (service as any).getDateRange(TimeRange.LAST_7D);
      const diff = range.end.getTime() - range.start.getTime();
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should handle custom date range', () => {
      const start = '2024-01-01';
      const end = '2024-01-31';
      const range = (service as any).getDateRange(TimeRange.CUSTOM, start, end);
      expect(range.start).toEqual(new Date(start));
      expect(range.end).toEqual(new Date(end));
    });
  });
});
