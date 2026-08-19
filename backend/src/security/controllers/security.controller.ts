import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VulnerabilityManagementService } from '../services/vulnerability-management.service';
import { IngestScanDto } from '../dto/ingest-scan.dto';
import { AssignVulnerabilityDto } from '../dto/assign-vulnerability.dto';
import { ResolveVulnerabilityDto, IgnoreVulnerabilityDto } from '../dto/resolve-vulnerability.dto';
import { ScanIngestGuard } from '../guards/scan-ingest.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

@Controller('security')
export class SecurityController {
  constructor(private readonly vulnerabilityService: VulnerabilityManagementService) {}

  @Post('scans/ingest')
  @UseGuards(ScanIngestGuard)
  async ingestScan(@Body() dto: IngestScanDto) {
    return this.vulnerabilityService.ingestScan(dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getDashboard() {
    return this.vulnerabilityService.getDashboard();
  }

  @Get('vulnerabilities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getVulnerabilities(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.vulnerabilityService.findAll({ severity, status, type });
  }

  @Get('vulnerabilities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getVulnerability(@Param('id') id: string) {
    return this.vulnerabilityService.findOne(id);
  }

  @Post('vulnerabilities/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async assignVulnerability(@Param('id') id: string, @Body() dto: AssignVulnerabilityDto) {
    return this.vulnerabilityService.assign(id, dto.assignee);
  }

  @Post('vulnerabilities/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async resolveVulnerability(@Param('id') id: string, @Body() dto: ResolveVulnerabilityDto) {
    return this.vulnerabilityService.resolve(id, dto.resolution);
  }

  @Post('vulnerabilities/:id/ignore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async ignoreVulnerability(@Param('id') id: string, @Body() dto: IgnoreVulnerabilityDto) {
    return this.vulnerabilityService.ignore(id, dto.reason);
  }
}
