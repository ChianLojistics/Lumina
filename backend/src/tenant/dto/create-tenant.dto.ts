import { IsString, IsEmail, IsOptional, IsEnum, IsObject, Matches, MaxLength } from 'class-validator';
import { TenantStatus } from '../entities/tenant.entity';

export class CreateTenantDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @IsEmail()
  admin_email?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsObject()
  branding_config?: Record<string, any>;

  @IsOptional()
  @IsObject()
  quota_config?: Record<string, any>;

  @IsOptional()
  @IsObject()
  feature_config?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
