import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { RevenueForecast } from './entities/revenue-forecast.entity';
import { CustomerAnalytics } from './entities/customer-analytics.entity';
import { CustomReport } from './entities/custom-report.entity';
import { AnalyticsCacheService } from './analytics-cache.service';
import { 
  GetMetricsDto, 
  MetricCardDto, 
  ChartDataDto, 
  RevenueDataDto,
  PaymentMethodDistributionDto,
  GeographicDataDto,
  TimeRange 
} from './dto/metrics.dto';
import { 
  GetForecastDto, 
  ForecastDataDto, 
  ForecastSummaryDto,
  ForecastScenario 
} from './dto/forecast.dto';
import { 
  CustomerAnalyticsDto,
  CustomerSegmentDto,
  CustomerCohortDto,
  FunnelStageDto 
} from './dto/customer.dto';
import { CreateReportDto, ExportReportDto, ReportFormat } from './dto/report.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsMetric)
    private metricsRepository: Repository<AnalyticsMetric>,
    @InjectRepository(RevenueForecast)
    private forecastRepository: Repository<RevenueForecast>,
    @InjectRepository(CustomerAnalytics)
    private customerAnalyticsRepository: Repository<CustomerAnalytics>,
    @InjectRepository(CustomReport)
    private reportsRepository: Repository<CustomReport>,
    private cacheService: AnalyticsCacheService,
  ) {}

  private getDateRange(timeRange: TimeRange, startDate?: string, endDate?: string) {
    const now = new Date();
    if (timeRange === TimeRange.CUSTOM && startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    const ranges = {
      [TimeRange.LAST_24H]: { hours: 24 },
      [TimeRange.LAST_7D]: { days: 7 },
      [TimeRange.LAST_30D]: { days: 30 },
      [TimeRange.LAST_90D]: { days: 90 },
    };

    const range = ranges[timeRange] || ranges[TimeRange.LAST_7D];
    const start = new Date(now.getTime() - (range.days || 0) * 24 * 60 * 60 * 1000 - (range.hours || 0) * 60 * 60 * 1000);
    
    return { start, end: now };
  }

  async getMetrics(merchantId: string, dto: GetMetricsDto): Promise<{
    cards: MetricCardDto[];
    revenue: RevenueDataDto;
    paymentMethods: PaymentMethodDistributionDto[];
    geographic: GeographicDataDto[];
  }> {
    // Try cache first
    const cached = await this.cacheService.getMetrics(merchantId, dto.timeRange || TimeRange.LAST_7D);
    if (cached) {
      return cached;
    }

    const { start, end } = this.getDateRange(dto.timeRange, dto.startDate, dto.endDate);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    const metrics = await this.metricsRepository.find({
      where: {
        merchantId,
        timestamp: Between(start, end),
      },
      order: { timestamp: 'ASC' },
    });

    const previousMetrics = await this.metricsRepository.find({
      where: {
        merchantId,
        timestamp: Between(previousStart, start),
      },
    });

    const cards = await this.calculateMetricCards(merchantId, metrics, previousMetrics);
    const revenue = await this.calculateRevenueData(metrics);
    const paymentMethods = await this.getPaymentMethodDistribution(merchantId, start, end);
    const geographic = await this.getGeographicDistribution(merchantId, start, end);

    const result = { cards, revenue, paymentMethods, geographic };
    
    // Cache the result
    await this.cacheService.setMetrics(merchantId, dto.timeRange || TimeRange.LAST_7D, result);
    
    return result;
  }

  private async calculateMetricCards(
    merchantId: string,
    currentMetrics: AnalyticsMetric[],
    previousMetrics: AnalyticsMetric[],
  ): Promise<MetricCardDto[]> {
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const getMetricSum = (metrics: AnalyticsMetric[], name: string) => 
      metrics.filter(m => m.metricName === name).reduce((sum, m) => sum + Number(m.metricValue), 0);

    const currentRevenue = getMetricSum(currentMetrics, 'revenue');
    const previousRevenue = getMetricSum(previousMetrics, 'revenue');
    const currentVolume = getMetricSum(currentMetrics, 'transaction_volume');
    const previousVolume = getMetricSum(previousMetrics, 'transaction_volume');
    const currentSuccess = getMetricSum(currentMetrics, 'successful_transactions');
    const previousSuccess = getMetricSum(previousMetrics, 'successful_transactions');
    const currentTotal = getMetricSum(currentMetrics, 'total_transactions');
    const previousTotal = getMetricSum(previousMetrics, 'total_transactions');

    const currentSuccessRate = currentTotal > 0 ? (currentSuccess / currentTotal) * 100 : 0;
    const previousSuccessRate = previousTotal > 0 ? (previousSuccess / previousTotal) * 100 : 0;

    const avgOrderValue = currentVolume > 0 ? currentRevenue / currentVolume : 0;
    const previousAvgOrderValue = previousVolume > 0 ? previousRevenue / previousVolume : 0;

    return [
      {
        name: 'Revenue',
        value: currentRevenue,
        change: calculateChange(currentRevenue, previousRevenue),
        changePeriod: 'previous period',
        trend: currentRevenue >= previousRevenue ? 'up' : 'down',
      },
      {
        name: 'Transaction Volume',
        value: currentVolume,
        change: calculateChange(currentVolume, previousVolume),
        changePeriod: 'previous period',
        trend: currentVolume >= previousVolume ? 'up' : 'down',
      },
      {
        name: 'Success Rate',
        value: currentSuccessRate,
        change: calculateChange(currentSuccessRate, previousSuccessRate),
        changePeriod: 'previous period',
        trend: currentSuccessRate >= previousSuccessRate ? 'up' : 'down',
      },
      {
        name: 'Average Order Value',
        value: avgOrderValue,
        change: calculateChange(avgOrderValue, previousAvgOrderValue),
        changePeriod: 'previous period',
        trend: avgOrderValue >= previousAvgOrderValue ? 'up' : 'down',
      },
    ];
  }

  private async calculateRevenueData(metrics: AnalyticsMetric[]): Promise<RevenueDataDto> {
    const revenueMetrics = metrics.filter(m => m.metricName === 'revenue');
    
    const data: ChartDataDto[] = revenueMetrics.map(m => ({
      date: m.timestamp.toISOString(),
      value: Number(m.metricValue),
    }));

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    return { total, growth, data };
  }

  private async getPaymentMethodDistribution(
    merchantId: string,
    start: Date,
    end: Date,
  ): Promise<PaymentMethodDistributionDto[]> {
    const metrics = await this.metricsRepository.find({
      where: {
        merchantId,
        metricName: 'payment_method',
        timestamp: Between(start, end),
      },
    });

    const distribution = metrics.reduce((acc, m) => {
      const method = m.dimensions?.method || 'unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count += 1;
      acc[method].amount += Number(m.metricValue);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const total = Object.values(distribution).reduce((sum, d) => sum + d.count, 0);

    return Object.entries(distribution).map(([method, data]) => ({
      method,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      amount: data.amount,
    }));
  }

  private async getGeographicDistribution(
    merchantId: string,
    start: Date,
    end: Date,
  ): Promise<GeographicDataDto[]> {
    const metrics = await this.metricsRepository.find({
      where: {
        merchantId,
        metricName: 'geographic',
        timestamp: Between(start, end),
      },
    });

    const distribution = metrics.reduce((acc, m) => {
      const country = m.dimensions?.country || 'unknown';
      if (!acc[country]) {
        acc[country] = { count: 0, amount: 0 };
      }
      acc[country].count += 1;
      acc[country].amount += Number(m.metricValue);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return Object.entries(distribution).map(([country, data]) => ({
      country,
      count: data.count,
      amount: data.amount,
    }));
  }

  async getForecast(merchantId: string, dto: GetForecastDto): Promise<ForecastSummaryDto> {
    const { startDate, endDate, scenario = ForecastScenario.BASELINE } = dto;
    const days = startDate && endDate 
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Try cache first
    const cached = await this.cacheService.getForecast(merchantId, scenario, days);
    if (cached) {
      return cached;
    }
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const forecasts = await this.forecastRepository.find({
      where: {
        merchantId,
        forecastDate: Between(start, end),
        scenario,
      },
      order: { forecastDate: 'ASC' },
    });

    let result: ForecastSummaryDto;

    if (forecasts.length === 0) {
      result = this.generateMockForecast(merchantId, start, end, scenario);
    } else {
      const data: ForecastDataDto[] = forecasts.map(f => ({
        date: f.forecastDate.toISOString(),
        predictedRevenue: Number(f.predictedRevenue),
        confidenceLower: Number(f.confidenceLower),
        confidenceUpper: Number(f.confidenceUpper),
        scenario: f.scenario || ForecastScenario.BASELINE,
      }));

      const totalPredicted = data.reduce((sum, d) => sum + d.predictedRevenue, 0);
      const averageDaily = totalPredicted / data.length;
      const confidence = this.calculateConfidenceScore(data);

      result = {
        totalPredicted,
        averageDaily,
        growthRate: 5.2,
        confidence,
        data,
      };
    }

    // Cache the result
    await this.cacheService.setForecast(merchantId, scenario, days, result);
    
    return result;
  }

  private calculateConfidenceScore(data: ForecastDataDto[]): number {
    if (data.length === 0) return 0;
    const avgSpread = data.reduce((sum, d) => 
      sum + (d.confidenceUpper - d.confidenceLower), 0) / data.length;
    const avgValue = data.reduce((sum, d) => sum + d.predictedRevenue, 0) / data.length;
    return avgValue > 0 ? Math.max(0, 100 - (avgSpread / avgValue) * 100) : 0;
  }

  private async generateMockForecast(
    merchantId: string,
    start: Date,
    end: Date,
    scenario: ForecastScenario,
  ): Promise<ForecastSummaryDto> {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const data: ForecastDataDto[] = [];
    const baseRevenue = 1000;
    const volatility = scenario === ForecastScenario.OPTIMISTIC ? 0.1 : 
                       scenario === ForecastScenario.PESSIMISTIC ? 0.2 : 0.15;

    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      const trendFactor = 1 + (i / days) * 0.05;
      const predictedRevenue = baseRevenue * randomFactor * trendFactor;
      const confidenceSpread = predictedRevenue * 0.2;

      data.push({
        date: date.toISOString(),
        predictedRevenue,
        confidenceLower: predictedRevenue - confidenceSpread,
        confidenceUpper: predictedRevenue + confidenceSpread,
        scenario,
      });
    }

    const totalPredicted = data.reduce((sum, d) => sum + d.predictedRevenue, 0);
    const averageDaily = totalPredicted / data.length;

    return {
      totalPredicted,
      averageDaily,
      growthRate: 5.2,
      confidence: 75,
      data,
    };
  }

  async getCustomerAnalytics(merchantId: string): Promise<CustomerAnalyticsDto> {
    // Try cache first
    const cached = await this.cacheService.getCustomerAnalytics(merchantId);
    if (cached) {
      return cached;
    }

    const customers = await this.customerAnalyticsRepository.find({
      where: { merchantId },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeCustomers = customers.filter(
      c => c.lastPurchase && c.lastPurchase >= thirtyDaysAgo,
    ).length;

    const newCustomers = customers.filter(
      c => c.firstPurchase && c.firstPurchase >= thirtyDaysAgo,
    ).length;

    const returningCustomers = customers.filter(
      c => c.totalTransactions > 1,
    ).length;

    const segments = this.calculateCustomerSegments(customers);
    const cohorts = this.calculateCustomerCohorts(customers);
    const funnel = this.calculateConversionFunnel(merchantId);

    const result = {
      totalCustomers: customers.length,
      activeCustomers,
      newCustomers,
      returningCustomers,
      segments,
      cohorts,
      funnel,
    };

    // Cache the result
    await this.cacheService.setCustomerAnalytics(merchantId, result);
    
    return result;
  }

  private calculateCustomerSegments(customers: CustomerAnalytics[]): CustomerSegmentDto[] {
    const segments = [
      { name: 'high-value', minSpent: 5000 },
      { name: 'medium-value', minSpent: 1000 },
      { name: 'low-value', minSpent: 0 },
    ];

    return segments.map(segment => {
      const segmentCustomers = customers.filter(c => c.totalSpent >= segment.minSpent);
      const avgSpent = segmentCustomers.length > 0 
        ? segmentCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / segmentCustomers.length 
        : 0;
      const avgTransactions = segmentCustomers.length > 0
        ? segmentCustomers.reduce((sum, c) => sum + c.totalTransactions, 0) / segmentCustomers.length
        : 0;
      const churnRate = segmentCustomers.filter(c => c.churnProbability && c.churnProbability > 0.5).length / 
                        (segmentCustomers.length || 1);

      return {
        segment: segment.name,
        count: segmentCustomers.length,
        avgSpent,
        avgTransactions,
        churnRate,
      };
    });
  }

  private calculateCustomerCohorts(customers: CustomerAnalytics[]): CustomerCohortDto[] {
    const cohorts: CustomerCohortDto[] = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const cohortStart = new Date(now.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000);
      const cohortEnd = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      
      const cohortCustomers = customers.filter(
        c => c.firstPurchase && c.firstPurchase >= cohortStart && c.firstPurchase < cohortEnd,
      );

      const retainedCustomers = cohortCustomers.filter(
        c => c.lastPurchase && c.lastPurchase >= cohortEnd,
      );

      const avgSpent = cohortCustomers.length > 0
        ? cohortCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / cohortCustomers.length
        : 0;

      cohorts.push({
        cohort: `Cohort ${i + 1}`,
        period: cohortStart.toISOString().split('T')[0],
        customers: cohortCustomers.length,
        retention: cohortCustomers.length > 0 ? (retainedCustomers.length / cohortCustomers.length) * 100 : 0,
        avgSpent,
      });
    }

    return cohorts;
  }

  private async calculateConversionFunnel(merchantId: string): Promise<FunnelStageDto[]> {
    const stages = [
      { name: 'page_view', count: 10000 },
      { name: 'initiate_checkout', count: 5000 },
      { name: 'add_payment', count: 3000 },
      { name: 'confirm_payment', count: 2000 },
      { name: 'complete_payment', count: 1500 },
    ];

    return stages.map((stage, index) => {
      const previousCount = index > 0 ? stages[index - 1].count : stage.count;
      const conversionRate = (stage.count / stages[0].count) * 100;
      const dropOff = previousCount > 0 ? ((previousCount - stage.count) / previousCount) * 100 : 0;

      return {
        stage: stage.name,
        count: stage.count,
        conversionRate,
        dropOff: index === 0 ? 0 : dropOff,
      };
    });
  }

  async createReport(merchantId: string, dto: CreateReportDto): Promise<CustomReport> {
    const report = this.reportsRepository.create({
      merchantId,
      name: dto.name,
      config: {
        metrics: dto.metrics,
        filters: dto.filters || {},
        groupBy: dto.groupBy || [],
        timeRange: dto.timeRange,
      },
      schedule: dto.schedule,
    });

    return this.reportsRepository.save(report);
  }

  async getReports(merchantId: string): Promise<CustomReport[]> {
    return this.reportsRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async exportReport(merchantId: string, dto: ExportReportDto): Promise<Buffer> {
    const report = await this.reportsRepository.findOne({
      where: { id: dto.reportId, merchantId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const { start, end } = this.getDateRange(
      TimeRange.CUSTOM,
      dto.startDate,
      dto.endDate,
    );

    const metrics = await this.metricsRepository.find({
      where: {
        merchantId,
        timestamp: Between(start, end),
      },
    });

    switch (dto.format) {
      case ReportFormat.CSV:
        return this.generateCSV(metrics);
      case ReportFormat.JSON:
        return Buffer.from(JSON.stringify(metrics, null, 2));
      case ReportFormat.PDF:
        return this.generatePDF(metrics);
      default:
        throw new Error('Unsupported format');
    }
  }

  private generateCSV(metrics: AnalyticsMetric[]): Buffer {
    const headers = ['id', 'merchantId', 'metricName', 'metricValue', 'timestamp', 'dimensions'];
    const rows = metrics.map(m => [
      m.id,
      m.merchantId,
      m.metricName,
      m.metricValue.toString(),
      m.timestamp.toISOString(),
      JSON.stringify(m.dimensions),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return Buffer.from(csv);
  }

  private generatePDF(metrics: AnalyticsMetric[]): Buffer {
    // Simplified PDF generation - in production, use a proper PDF library
    const content = metrics.map(m => 
      `${m.metricName}: ${m.metricValue} at ${m.timestamp.toISOString()}`
    ).join('\n');
    return Buffer.from(content);
  }
}
