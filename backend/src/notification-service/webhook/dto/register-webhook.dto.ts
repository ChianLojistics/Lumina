import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { NotificationEvent } from '../../events/notification-event.enum';

export class RegisterWebhookDto {
  @IsString()
  @IsNotEmpty()
  merchant_id: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(NotificationEvent, { each: true })
  events: NotificationEvent[];
}
