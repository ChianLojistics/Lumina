import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { AnomalyAlert, AnomalySeverity, AnomalyStatus } from './entities/anomaly-alert.entity';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let metricsRepository: Repository<AnalyticsMetric>;
  let alertsRepository: Repository<AnomalyAlert>;

  const mockMetricsRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAlertsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        {
          provide: getRepositoryToken(AnalyticsMetric),
          useValue: mockMetricsRepository,
        },
        {
          provide: getRepositoryToken(AnomalyAlert),
          useValue: mockAlertsRepository,
        },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
    metricsRepository = module.get<Repository<AnalyticsMetric>>(getRepositoryToken(AnalyticsMetric));
    alertsRepository = module.get<Repository<AnomalyAlert>>(getRepositoryToken(AnomalyAlert));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectAnomaliesForMerchant', () => {
    it('should detect revenue drop anomaly', async () => {
      const currentMetrics = [
        { metricName: 'revenue', metricValue: 3000, timestamp: new Date() },
      ];

      const historicalMetrics = [
        { metricName: 'revenue', metricValue: 5000, timestamp: new Date() },
        { metricName: 'revenue', metricValue: 4800, timestamp: new Date() },
      ];

      mockMetricsRepository.find.mockResolvedValueOnce(currentMetrics).mockResolvedValueOnce(historicalMetrics);
      mockAlertsRepository.findOne.mockResolvedValue(null);
      mockAlertsRepository.create.mockReturnValue({
        merchantId: 'merchant-1',
        type: 'revenue_drop',
        severity: AnomalySeverity.HIGH,
        status: AnomalyStatus.OPEN,
        description: 'test',
        metadata: {},
      });
      mockAlertsRepository.save.mockResolvedValue({ id: '1' });

      const anomalies = await service.detectAnomaliesForMerchant('merchant-1');

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('revenue_drop');
      expect(anomalies[0].severity).toBe(AnomalySeverity.HIGH);
    });

    it('should not create alert for small deviation', async () => {
      const currentMetrics = [
        { metricName: 'revenue', metricValue: 4800, timestamp: new Date() },
      ];

      const historicalMetrics = [
        { metricName: 'revenue', metricValue: 5000, timestamp: new Date() },
      ];

      mockMetricsRepository.find.mockResolvedValueOnce(currentMetrics).mockResolvedValueOnce(historicalMetrics);

      const anomalies = await service.detectAnomaliesForMerchant('merchant-1');

      expect(anomalies).toHaveLength(0);
    });

    it('should not create alert if similar alert exists recently', async () => {
      const currentMetrics = [
        { metricName: 'revenue', metricValue: 3000, timestamp: new Date() },
      ];

      const historicalMetrics = [
        { metricName: 'revenue', metricValue: 5000, timestamp: new Date() },
      ];

      mockMetricsRepository.find.mockResolvedValueOnce(currentMetrics).mockResolvedValueOnce(historicalMetrics);
      mockAlertsRepository.findOne.mockResolvedValue({ id: '1', createdAt: new Date() });

      const anomalies = await service.detectAnomaliesForMerchant('merchant-1');

      expect(anomalies).toHaveLength(0);
      expect(mockAlertsRepository.create).not.toHaveBeenCalled();
    });

    it('should skip metrics below minimum absolute value', async () => {
      const currentMetrics = [
        { metricName: 'revenue', metricValue: 500, timestamp: new Date() },
      ];

      const historicalMetrics = [
        { metricName: 'revenue', metricValue: 1000, timestamp: new Date() },
      ];

      mockMetricsRepository.find.mockResolvedValueOnce(currentMetrics).mockResolvedValueOnce(historicalMetrics);

      const anomalies = await service.detectAnomaliesForMerchant('merchant-1');

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts with filters', async () => {
      const mockAlerts = [
        { id: '1', merchantId: 'merchant-1', status: AnomalyStatus.OPEN, severity: AnomalySeverity.HIGH },
        { id: '2', merchantId: 'merchant-1', status: AnomalyStatus.RESOLVED, severity: AnomalySeverity.MEDIUM },
      ];

      mockAlertsRepository.find.mockResolvedValue(mockAlerts);

      const result = await service.getAlerts('merchant-1', AnomalyStatus.OPEN);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(AnomalyStatus.OPEN);
    });

    it('should return all alerts when no filters provided', async () => {
      const mockAlerts = [
        { id: '1', merchantId: 'merchant-1', status: AnomalyStatus.OPEN },
        { id: '2', merchantId: 'merchant-1', status: AnomalyStatus.RESOLVED },
      ];

      mockAlertsRepository.find.mockResolvedValue(mockAlerts);

      const result = await service.getAlerts('merchant-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const mockAlert = {
        id: '1',
        status: AnomalyStatus.OPEN,
      };

      mockAlertsRepository.findOne.mockResolvedValue(mockAlert);
      mockAlertsRepository.save.mockResolvedValue({
        ...mockAlert,
        status: AnomalyStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy: 'user-1',
      });

      const result = await service.acknowledgeAlert('1', 'user-1');

      expect(result.status).toBe(AnomalyStatus.ACKNOWLEDGED);
      expect(result.acknowledgedBy).toBe('user-1');
      expect(result.acknowledgedAt).toBeDefined();
    });

    it('should throw error if alert not found', async () => {
      mockAlertsRepository.findOne.mockResolvedValue(null);

      await expect(service.acknowledgeAlert('nonexistent', 'user-1')).rejects.toThrow('Alert not found');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert with notes', async () => {
      const mockAlert = {
        id: '1',
        status: AnomalyStatus.OPEN,
      };

      mockAlertsRepository.findOne.mockResolvedValue(mockAlert);
      mockAlertsRepository.save.mockResolvedValue({
        ...mockAlert,
        status: AnomalyStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNotes: 'Investigated and fixed',
      });

      const result = await service.resolveAlert('1', 'Investigated and fixed');

      expect(result.status).toBe(AnomalyStatus.RESOLVED);
      expect(result.resolutionNotes).toBe('Investigated and fixed');
      expect(result.resolvedAt).toBeDefined();
    });
  });

  describe('markAsFalsePositive', () => {
    it('should mark alert as false positive', async () => {
      const mockAlert = {
        id: '1',
        status: AnomalyStatus.OPEN,
      };

      mockAlertsRepository.findOne.mockResolvedValue(mockAlert);
      mockAlertsRepository.save.mockResolvedValue({
        ...mockAlert,
        status: AnomalyStatus.FALSE_POSITIVE,
        resolvedAt: new Date(),
      });

      const result = await service.markAsFalsePositive('1');

      expect(result.status).toBe(AnomalyStatus.FALSE_POSITIVE);
    });
  });

  describe('getAnomalyStats', () => {
    it('should calculate anomaly statistics', async () => {
      const mockAlerts = [
        { id: '1', status: AnomalyStatus.OPEN, severity: AnomalySeverity.HIGH, type: 'revenue_drop' },
        { id: '2', status: AnomalyStatus.OPEN, severity: AnomalySeverity.MEDIUM, type: 'success_rate_drop' },
        { id: '3', status: AnomalyStatus.ACKNOWLEDGED, severity: AnomalySeverity.HIGH, type: 'revenue_drop' },
        { id: '4', status: AnomalyStatus.RESOLVED, severity: AnomalySeverity.LOW, type: 'unusual_volume' },
      ];

      mockAlertsRepository.find.mockResolvedValue(mockAlerts);

      const stats = await service.getAnomalyStats('merchant-1');

      expect(stats.total).toBe(4);
      expect(stats.open).toBe(2);
      expect(stats.acknowledged).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.bySeverity[AnomalySeverity.HIGH]).toBe(2);
      expect(stats.byType['revenue_drop']).toBe(2);
    });
  });
});
