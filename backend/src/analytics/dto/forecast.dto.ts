import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ForecastScenario {
  OPTIMISTIC = 'optimistic',
  PESSIMISTIC = 'pessimistic',
  BASELINE = 'baseline',
}

export class GetForecastDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ForecastScenario)
  scenario?: ForecastScenario;
}

export class ForecastDataDto {
  date: string;
  predictedRevenue: number;
  confidenceLower: number;
  confidenceUpper: number;
  scenario: ForecastScenario;
}

export class ForecastSummaryDto {
  totalPredicted: number;
  averageDaily: number;
  growthRate: number;
  confidence: number;
  data: ForecastDataDto[];
}
