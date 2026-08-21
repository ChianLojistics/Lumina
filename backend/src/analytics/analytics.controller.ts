import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetMetricsDto } from './dto/metrics.dto';
import { GetForecastDto } from './dto/forecast.dto';
import { CreateReportDto, ExportReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  async getMetrics(@Req() req, @Query() dto: GetMetricsDto) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.analyticsService.getMetrics(merchantId, dto);
  }

  @Get('forecast')
  async getForecast(@Req() req, @Query() dto: GetForecastDto) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.analyticsService.getForecast(merchantId, dto);
  }

  @Get('customers')
  async getCustomerAnalytics(@Req() req) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.analyticsService.getCustomerAnalytics(merchantId);
  }

  @Post('reports')
  async createReport(@Req() req, @Body() dto: CreateReportDto) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.analyticsService.createReport(merchantId, dto);
  }

  @Get('reports')
  async getReports(@Req() req) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.analyticsService.getReports(merchantId);
  }

  @Post('export')
  async exportReport(@Req() req, @Body() dto: ExportReportDto, @Res() res) {
    const merchantId = req.user.merchantId || req.user.id;
    const buffer = await this.analyticsService.exportReport(merchantId, dto);

    const contentTypeMap = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypeMap[dto.format]);
    res.setHeader('Content-Disposition', `attachment; filename=report.${dto.format}`);
    res.status(HttpStatus.OK).send(buffer);
  }
}
