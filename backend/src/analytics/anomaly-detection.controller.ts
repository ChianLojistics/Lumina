import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AnomalyAlert, AnomalyStatus, AnomalySeverity } from './entities/anomaly-alert.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics/anomalies')
@UseGuards(JwtAuthGuard)
export class AnomalyDetectionController {
  constructor(private readonly anomalyService: AnomalyDetectionService) {}

  @Get()
  async getAlerts(
    @Req() req,
    @Query('status') status?: AnomalyStatus,
    @Query('severity') severity?: AnomalySeverity,
    @Query('limit') limit?: string,
  ) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.anomalyService.getAlerts(
      merchantId,
      status,
      severity,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('stats')
  async getStats(@Req() req) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.anomalyService.getAnomalyStats(merchantId);
  }

  @Post(':alertId/acknowledge')
  async acknowledgeAlert(@Req() req, @Param('alertId') alertId: string) {
    const userId = req.user.id;
    return this.anomalyService.acknowledgeAlert(alertId, userId);
  }

  @Post(':alertId/resolve')
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body('notes') notes: string,
  ) {
    return this.anomalyService.resolveAlert(alertId, notes);
  }

  @Post(':alertId/false-positive')
  async markAsFalsePositive(@Param('alertId') alertId: string) {
    return this.anomalyService.markAsFalsePositive(alertId);
  }

  @Post('detect')
  async triggerDetection(@Req() req) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.anomalyService.detectAnomaliesForMerchant(merchantId);
  }
}
