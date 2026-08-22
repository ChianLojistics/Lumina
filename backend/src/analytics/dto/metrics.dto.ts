import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum TimeRange {
  LAST_24H = '24h',
  LAST_7D = '7d',
  LAST_30D = '30d',
  LAST_90D = '90d',
  CUSTOM = 'custom',
}

export class GetMetricsDto {
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class MetricCardDto {
  name: string;
  value: number;
  change: number;
  changePeriod: string;
  trend: 'up' | 'down' | 'neutral';
}

export class ChartDataDto {
  date: string;
  value: number;
  label?: string;
}

export class RevenueDataDto {
  total: number;
  growth: number;
  data: ChartDataDto[];
}

export class PaymentMethodDistributionDto {
  method: string;
  count: number;
  percentage: number;
  amount: number;
}

export class GeographicDataDto {
  country: string;
  count: number;
  amount: number;
  latitude?: number;
  longitude?: number;
}
