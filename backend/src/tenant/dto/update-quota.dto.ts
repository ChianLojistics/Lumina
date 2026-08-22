import { IsObject, IsOptional, IsNumber } from 'class-validator';

export class UpdateQuotaDto {
  @IsOptional()
  @IsObject()
  apiCalls?: {
    daily?: number;
    hourly?: number;
  };

  @IsOptional()
  @IsObject()
  transactions?: {
    daily?: number;
    monthly?: number;
  };

  @IsOptional()
  @IsObject()
  storage?: {
    maxBytes?: number;
  };

  @IsOptional()
  @IsObject()
  webhooks?: {
    maxEndpoints?: number;
  };

  @IsOptional()
  @IsObject()
  customDomains?: {
    maxDomains?: number;
  };
}
