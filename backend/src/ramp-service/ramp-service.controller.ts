import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { RampService } from './ramp-service.service';
import { InitiateOnRampDto } from './dto/initiate-onramp.dto';
import { InitiateOffRampDto } from './dto/initiate-offramp.dto';
import { WebhookDto } from './dto/webhook.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { InitiateKycDto } from './dto/initiate-kyc.dto';

@Controller('api/ramp')
export class RampController {
  constructor(private readonly rampService: RampService) {}

  @Post('onramp/initiate')
  async initiateOnRamp(@Body() dto: InitiateOnRampDto) {
    return this.rampService.initiateOnRamp(dto);
  }

  @Get('onramp/status/:operationId')
  async getOnRampStatus(@Param('operationId') operationId: string) {
    return this.rampService.getOperationStatus(operationId);
  }

  @Post('offramp/initiate')
  async initiateOffRamp(@Body() dto: InitiateOffRampDto) {
    return this.rampService.initiateOffRamp(dto);
  }

  @Get('offramp/status/:operationId')
  async getOffRampStatus(@Param('operationId') operationId: string) {
    return this.rampService.getOperationStatus(operationId);
  }

  @Post('webhook')
  async processWebhook(@Body() dto: WebhookDto) {
    return this.rampService.processOnRampWebhook(dto);
  }

  @Post('bank-account')
  async createBankAccount(@Body() dto: CreateBankAccountDto) {
    return this.rampService.createBankAccount(dto);
  }

  @Post('kyc/initiate')
  async initiateKyc(@Body() dto: InitiateKycDto) {
    return this.rampService.initiateKyc(dto);
  }

  @Get('kyc/status/:userId')
  async getKycStatus(@Param('userId') userId: string) {
    return this.rampService.getKycStatus(userId);
  }
}
