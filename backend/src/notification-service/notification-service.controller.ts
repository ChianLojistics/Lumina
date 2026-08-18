import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { NotificationServiceService } from './notification-service.service';
import { RegisterWebhookDto } from './webhook/dto/register-webhook.dto';
import { UpdateWebhookDto } from './webhook/dto/update-webhook.dto';
import { TestWebhookDto } from './webhook/dto/test-webhook.dto';
import { SendEmailDto } from './email/dto/send-email.dto';

@Controller(['api/webhooks', 'api/notifications'])
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationServiceService) {}

  @Post()
  registerWebhook(@Body() dto: RegisterWebhookDto) {
    return this.notificationService.registerWebhook(dto);
  }

  @Post('webhooks/register')
  registerWebhookLegacy(@Body() dto: RegisterWebhookDto) {
    return this.notificationService.registerWebhook(dto);
  }

  @Get()
  listWebhooks(@Query('merchant_id') merchantId?: string) {
    return this.notificationService.listWebhooks(merchantId);
  }

  @Get('webhooks')
  listWebhooksLegacy(@Query('merchant_id') merchantId?: string) {
    return this.notificationService.listWebhooks(merchantId);
  }

  @Get('stats')
  getWebhookStats(@Query('merchant_id') merchantId?: string) {
    return this.notificationService.getWebhookStats(merchantId);
  }

  @Get('dlq')
  getDLQItems(@Query('merchant_id') merchantId?: string) {
    return this.notificationService.getDLQItems(merchantId);
  }

  @Post('dlq/:id/retry')
  retryDLQItem(@Param('id') id: string) {
    return this.notificationService.retryDLQItem(id);
  }

  @Post('test')
  testWebhook(@Body() dto: TestWebhookDto) {
    return this.notificationService.testWebhook(dto);
  }

  @Get(':id')
  getWebhook(@Param('id') id: string) {
    return this.notificationService.getWebhook(id);
  }

  @Put(':id')
  updateWebhook(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.notificationService.updateWebhook(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWebhook(@Param('id') id: string) {
    return this.notificationService.deleteWebhook(id);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWebhookLegacy(@Param('id') id: string) {
    return this.notificationService.deleteWebhook(id);
  }

  @Post(':id/pause')
  pauseWebhook(@Param('id') id: string) {
    return this.notificationService.pauseWebhook(id);
  }

  @Post(':id/resume')
  resumeWebhook(@Param('id') id: string) {
    return this.notificationService.resumeWebhook(id);
  }

  @Post(':id/replay')
  replayFailedWebhooks(@Param('id') id: string) {
    return this.notificationService.replayFailedWebhooks(id);
  }

  @Get(':id/deliveries')
  getWebhookDeliveryStatus(@Param('id') id: string) {
    return this.notificationService.getWebhookDeliveryStatus(id);
  }

  @Get('webhooks/:id/deliveries')
  getWebhookDeliveryStatusLegacy(@Param('id') id: string) {
    return this.notificationService.getWebhookDeliveryStatus(id);
  }

  @Post('email/send')
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationService.sendEmail(dto);
  }
}
