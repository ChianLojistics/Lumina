import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class TestWebhookDto {
  @IsOptional()
  @IsString()
  webhook_id?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
