import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Provider } from '../entities/ramp-operation.entity';

export class WebhookDto {
  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  @IsString()
  @IsNotEmpty()
  event_type: string;

  @IsString()
  @IsNotEmpty()
  provider_transaction_id: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  data: Record<string, any>;
}
