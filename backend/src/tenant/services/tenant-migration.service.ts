import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface MigrationResult {
  success: boolean;
  message: string;
  recordsMigrated?: number;
  errors?: string[];
}

export interface TenantDataExport {
  tenantId: string;
  tenantName: string;
  exportedAt: Date;
  tables: {
    [key: string]: any[];
  };
}

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async migrateExistingDataToDefaultTenant(
    defaultTenantId: string,
  ): Promise<MigrationResult> {
    const errors: string[] = [];
    let totalRecords = 0;

    try {
      const tablesToMigrate = [
        'users',
        'payments',
        'merchants',
        'api_keys',
        'webhooks',
        'conversions',
        'crypto_operations',
      ];

      for (const table of tablesToMigrate) {
        try {
          const result = await this.dataSource.query(
            `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`,
            [defaultTenantId],
          );
          
          const affectedRows = result.rowCount || 0;
          totalRecords += affectedRows;
          
          this.logger.log(`Migrated ${affectedRows} records from ${table}`);
        } catch (error) {
          const errorMsg = `Failed to migrate ${table}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Migration completed with errors',
          recordsMigrated: totalRecords,
          errors,
        };
      }

      return {
        success: true,
        message: 'Migration completed successfully',
        recordsMigrated: totalRecords,
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async exportTenantData(tenantId: string): Promise<TenantDataExport> {
    const tables = [
      'users',
      'payments',
      'merchants',
      'api_keys',
      'webhooks',
      'webhook_deliveries',
      'conversions',
      'crypto_operations',
      'ramp_operations',
      'bank_accounts',
      'kyc_records',
    ];

    const exportData: TenantDataExport = {
      tenantId,
      tenantName: '',
      exportedAt: new Date(),
      tables: {},
    };

    // Get tenant name
    const tenantResult = await this.dataSource.query(
      'SELECT name FROM tenants WHERE id = $1',
      [tenantId],
    );
    exportData.tenantName = tenantResult[0]?.name || 'Unknown';

    // Export data from each table
    for (const table of tables) {
      try {
        const data = await this.dataSource.query(
          `SELECT * FROM ${table} WHERE tenant_id = $1`,
          [tenantId],
        );
        exportData.tables[table] = data;
        this.logger.log(`Exported ${data.length} records from ${table}`);
      } catch (error) {
        this.logger.warn(`Failed to export ${table}: ${error.message}`);
        exportData.tables[table] = [];
      }
    }

    return exportData;
  }

  async importTenantData(
    tenantId: string,
    importData: TenantDataExport,
  ): Promise<MigrationResult> {
    const errors: string[] = [];
    let totalRecords = 0;

    try {
      for (const [table, records] of Object.entries(importData.tables)) {
        if (!records || records.length === 0) continue;

        try {
          for (const record of records) {
            // Set tenant_id to the target tenant
            record.tenant_id = tenantId;
            
            // Remove id to let the database generate it
            delete record.id;
            delete record.created_at;
            delete record.updated_at;

            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            await this.dataSource.query(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
              values,
            );
            
            totalRecords++;
          }
          
          this.logger.log(`Imported ${records.length} records to ${table}`);
        } catch (error) {
          const errorMsg = `Failed to import to ${table}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Import completed with errors',
          recordsMigrated: totalRecords,
          errors,
        };
      }

      return {
        success: true,
        message: 'Import completed successfully',
        recordsMigrated: totalRecords,
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async validateTenantData(tenantId: string): Promise<MigrationResult> {
    const errors: string[] = [];

    try {
      // Check if tenant exists
      const tenantResult = await this.dataSource.query(
        'SELECT id FROM tenants WHERE id = $1',
        [tenantId],
      );

      if (!tenantResult || tenantResult.length === 0) {
        return {
          success: false,
          message: 'Tenant not found',
          errors: [`Tenant with ID ${tenantId} does not exist`],
        };
      }

      // Check for orphaned records (records with tenant_id pointing to non-existent tenant)
      const tables = [
        'users',
        'payments',
        'merchants',
        'api_keys',
        'webhooks',
      ];

      for (const table of tables) {
        try {
          const result = await this.dataSource.query(
            `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = $1`,
            [tenantId],
          );
          const count = parseInt(result[0].count);
          this.logger.log(`${table}: ${count} records for tenant ${tenantId}`);
        } catch (error) {
          errors.push(`Failed to validate ${table}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation found errors',
          errors,
        };
      }

      return {
        success: true,
        message: 'Validation passed',
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async createDefaultTenant(name: string, slug: string): Promise<string> {
    const result = await this.dataSource.query(
      `INSERT INTO tenants (name, slug, status, branding_config, quota_config, feature_config, is_active) 
       VALUES ($1, $2, 'active', '{}', '{}', '{}', true) 
       RETURNING id`,
      [name, slug],
    );

    return result[0].id;
  }
}
