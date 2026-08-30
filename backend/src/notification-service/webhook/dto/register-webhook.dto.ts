import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationEvent } from '../../events/notification-event.enum';

export class RegisterWebhookDto {
  @ApiProperty({ description: 'Merchant ID to associate with this webhook', example: 'merchant_abc123' })
  @IsString()
  @IsNotEmpty()
  merchant_id: string;

  @ApiProperty({ description: 'HTTPS URL to receive webhook POST requests', example: 'https://your-server.com/webhooks/lumina' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Events to subscribe to', enum: NotificationEvent, isArray: true, example: ['payment.completed', 'payment.failed'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(NotificationEvent, { each: true })
  events: NotificationEvent[];

  @ApiPropertyOptional({ description: 'Optional event filters' })
  @IsOptional()
  @IsObject()
  filters?: {
    amount?: { min?: number; max?: number };
    currency?: string[];
    status?: string[];
  };

  @ApiPropertyOptional({ description: 'Custom headers to include in webhook requests' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
