import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConversionEngineService } from './conversion-engine.service';
import { GetRateDto } from './dto/get-rate.dto';
import { EstimateConversionDto } from './dto/estimate-conversion.dto';
import { ExecuteConversionDto } from './dto/execute-conversion.dto';

@Controller('api/conversion')
export class ConversionEngineController {
  constructor(private readonly conversionEngineService: ConversionEngineService) {}

  @Get('rates')
  getRate(@Query() query: GetRateDto) {
    return this.conversionEngineService.getConversionRate(query.from, query.to);
  }

  @Get('estimate')
  estimate(@Query() query: EstimateConversionDto) {
    return this.conversionEngineService.estimateFee(query.from, query.to, parseFloat(query.amount));
  }

  @Post('execute')
  execute(@Body() dto: ExecuteConversionDto) {
    return this.conversionEngineService.executeConversion(dto.payment_id, dto.from_asset, dto.to_asset);
  }

  @Get('status/:paymentId')
  getStatus(@Param('paymentId') paymentId: string) {
    return this.conversionEngineService.getConversionStatus(paymentId);
  }
}
