import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';
import { EmailTemplate } from '../email-template.enum';

export class SendEmailDto {
  @IsUUID()
  @IsNotEmpty()
  merchant_id: string;

  @IsEnum(EmailTemplate)
  @IsNotEmpty()
  template: EmailTemplate;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
