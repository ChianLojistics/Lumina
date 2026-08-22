import { IsEnum, IsArray, IsOptional, IsString } from 'class-validator';

export enum ReportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json',
}

export class CreateReportDto {
  @IsString()
  name: string;

  @IsArray()
  metrics: string[];

  @IsOptional()
  filters?: Record<string, any>;

  @IsOptional()
  groupBy?: string[];

  @IsString()
  timeRange: string;

  @IsOptional()
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: ReportFormat;
  };
}

export class ExportReportDto {
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsString()
  reportId: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;
}
