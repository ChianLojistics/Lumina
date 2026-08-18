import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsUrl } from 'class-validator';
import { NotificationEvent } from '../../events/notification-event.enum';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationEvent, { each: true })
  events?: NotificationEvent[];

  @IsOptional()
  @IsObject()
  filters?: {
    amount?: { min?: number; max?: number };
    currency?: string[];
    status?: string[];
  };

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
