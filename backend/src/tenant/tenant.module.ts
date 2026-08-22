import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { TenantMigrationService } from './services/tenant-migration.service';
import { TenantBackupService } from './services/tenant-backup.service';
import { Tenant } from './entities/tenant.entity';
import { TenantUser } from './entities/tenant-user.entity';
import { TenantUsage } from './entities/tenant-usage.entity';
import { TenantAudit } from './entities/tenant-audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantUser, TenantUsage, TenantAudit]),
  ],
  controllers: [TenantController],
  providers: [
    TenantService, 
    TenantMiddleware, 
    TenantOnboardingService,
    TenantMigrationService,
    TenantBackupService,
  ],
  exports: [
    TenantService, 
    TenantMiddleware, 
    TenantOnboardingService,
    TenantMigrationService,
    TenantBackupService,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('api/tenants/(.*)') // Exclude tenant management endpoints from middleware
      .forRoutes('*');
  }
}
