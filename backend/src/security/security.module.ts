import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vulnerability } from './entities/vulnerability.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { ScanResultParser } from './parsers/scan-result.parser';
import { SecurityAlertService } from './services/security-alert.service';
import { VulnerabilityManagementService } from './services/vulnerability-management.service';
import { SecurityController } from './controllers/security.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vulnerability, SecurityEvent])],
  controllers: [SecurityController],
  providers: [ScanResultParser, SecurityAlertService, VulnerabilityManagementService],
  exports: [VulnerabilityManagementService],
})
export class SecurityModule {}
