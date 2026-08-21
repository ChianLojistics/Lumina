import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RateLimitPolicyService, CreatePolicyDto, UpdatePolicyDto } from '../services/rate-limit-policy.service';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitMonitoringService } from '../services/rate-limit-monitoring.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

@Controller('api/v1/policies')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class RateLimitController {
  constructor(
    private readonly policyService: RateLimitPolicyService,
    private readonly rateLimitService: RateLimitService,
    private readonly monitoringService: RateLimitMonitoringService,
  ) {}

  @Post()
  async createPolicy(@Body() dto: CreatePolicyDto) {
    return this.policyService.createPolicy(dto);
  }

  @Get()
  async getAllPolicies(@Query('activeOnly') activeOnly?: string) {
    return this.policyService.getAllPolicies(activeOnly === 'true');
  }

  @Get(':id')
  async getPolicy(@Param('id') id: string) {
    return this.policyService.getPolicyById(id);
  }

  @Put(':id')
  async updatePolicy(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.policyService.updatePolicy(id, dto);
  }

  @Delete(':id')
  async deletePolicy(@Param('id') id: string) {
    await this.policyService.deletePolicy(id);
    return { message: 'Policy deleted successfully' };
  }

  @Post(':id/activate')
  async activatePolicy(@Param('id') id: string) {
    return this.policyService.activatePolicy(id);
  }

  @Post(':id/deactivate')
  async deactivatePolicy(@Param('id') id: string) {
    return this.policyService.deactivatePolicy(id);
  }
}

@Controller('api/rate-limits')
export class RateLimitStatusController {
  constructor(
    private readonly policyService: RateLimitPolicyService,
    private readonly rateLimitService: RateLimitService,
    private readonly monitoringService: RateLimitMonitoringService,
  ) {}

  @Get('status')
  async getStatus() {
    return {
      systemLoad: this.rateLimitService.getSystemLoad(),
      redisAvailable: this.monitoringService.isRedisAvailable(),
      metrics: await this.monitoringService.getMetrics(),
    };
  }

  @Get('violations')
  async getViolations(
    @Query('userId') userId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('endpoint') endpoint?: string,
    @Query('limit') limit?: string,
  ) {
    return this.policyService.getViolations(
      userId,
      ipAddress,
      endpoint,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get('violations/stats')
  async getViolationStats(@Query('days') days?: string) {
    return this.policyService.getViolationStats(days ? parseInt(days) : 30);
  }
}
