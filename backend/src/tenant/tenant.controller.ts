import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddTenantUserDto } from './dto/add-tenant-user.dto';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { CompleteOnboardingStepDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly onboardingService: TenantOnboardingService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createTenantDto: CreateTenantDto, @Request() req) {
    return this.tenantService.create(createTenantDto, req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req,
  ) {
    return this.tenantService.update(id, updateTenantDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @Request() req) {
    return this.tenantService.remove(id, req.user.id);
  }

  @Post(':id/users')
  async addUser(
    @Param('id') id: string,
    @Body() addUserDto: AddTenantUserDto,
    @Request() req,
  ) {
    return this.tenantService.addUser(id, addUserDto, req.user.id);
  }

  @Delete(':id/users/:userId')
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.tenantService.removeUser(id, userId, req.user.id);
  }

  @Get(':id/quotas')
  async getQuotaUsage(@Param('id') id: string) {
    return this.tenantService.getQuotaUsage(id);
  }

  @Put(':id/quotas')
  @Roles(Role.ADMIN)
  async updateQuota(
    @Param('id') id: string,
    @Body() updateQuotaDto: UpdateQuotaDto,
    @Request() req,
  ) {
    return this.tenantService.updateQuota(id, updateQuotaDto, req.user.id);
  }

  @Get(':id/branding')
  async getBranding(@Param('id') id: string) {
    return this.tenantService.getBranding(id);
  }

  @Put(':id/branding')
  async updateBranding(
    @Param('id') id: string,
    @Body() updateBrandingDto: UpdateBrandingDto,
    @Request() req,
  ) {
    return this.tenantService.updateBranding(id, updateBrandingDto, req.user.id);
  }

  @Get(':id/audit')
  async getAuditLogs(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.tenantService.getAuditLogs(id, limit || 100);
  }

  @Post(':id/onboarding/start')
  async startOnboarding(
    @Param('id') id: string,
    @Body() createTenantDto: CreateTenantDto,
    @Request() req,
  ) {
    return this.onboardingService.startOnboarding(createTenantDto, req.user.id);
  }

  @Get(':id/onboarding/progress')
  async getOnboardingProgress(@Param('id') id: string) {
    return this.onboardingService.getOnboardingProgress(id);
  }

  @Post(':id/onboarding/complete')
  async completeOnboardingStep(
    @Param('id') id: string,
    @Body() completeStepDto: CompleteOnboardingStepDto,
    @Request() req,
  ) {
    return this.onboardingService.completeStep(id, completeStepDto.step, req.user.id);
  }

  @Post(':id/onboarding/skip')
  async skipOnboardingStep(
    @Param('id') id: string,
    @Body() completeStepDto: CompleteOnboardingStepDto,
    @Request() req,
  ) {
    return this.onboardingService.skipStep(id, completeStepDto.step, req.user.id);
  }

  @Post(':id/onboarding/reset')
  async resetOnboarding(@Param('id') id: string, @Request() req) {
    return this.onboardingService.resetOnboarding(id, req.user.id);
  }
}
