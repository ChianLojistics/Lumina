import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { NotificationServiceService } from './notification-service.service';
import { RegisterWebhookDto } from './webhook/dto/register-webhook.dto';
import { SendEmailDto } from './email/dto/send-email.dto';

@Controller('api/notifications')
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationServiceService) {}

  @Post('webhooks/register')
  registerWebhook(@Body() dto: RegisterWebhookDto) {
    return this.notificationService.registerWebhook(dto);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWebhook(@Param('id') id: string) {
    return this.notificationService.deleteWebhook(id);
  }

  @Get('webhooks/:id/deliveries')
  getWebhookDeliveryStatus(@Param('id') id: string) {
    return this.notificationService.getWebhookDeliveryStatus(id);
  }

  @Post('email/send')
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationService.sendEmail(dto);
  }
}
