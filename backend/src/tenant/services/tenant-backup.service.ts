import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupResult {
  success: boolean;
  message: string;
  backupPath?: string;
  size?: number;
  errors?: string[];
}

export interface RestoreResult {
  success: boolean;
  message: string;
  recordsRestored?: number;
  errors?: string[];
}

@Injectable()
export class TenantBackupService {
  private readonly logger = new Logger(TenantBackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');

  constructor(@InjectDataSource() private dataSource: DataSource) {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(tenantId: string): Promise<BackupResult> {
    const errors: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `tenant-${tenantId}-${timestamp}.json`);

    try {
      const tables = [
        'tenants',
        'tenant_users',
        'tenant_usage',
        'tenant_audit',
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

      const backupData: any = {
        tenantId,
        backupDate: new Date().toISOString(),
        tables: {},
      };

      for (const table of tables) {
        try {
          const data = await this.dataSource.query(
            `SELECT * FROM ${table} WHERE tenant_id = $1`,
            [tenantId],
          );
          backupData.tables[table] = data;
          this.logger.log(`Backed up ${data.length} records from ${table}`);
        } catch (error: any) {
          const errorMsg = `Failed to backup ${table}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
          backupData.tables[table] = [];
        }
      }

      // Write backup to file
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      const stats = fs.statSync(backupPath);

      return {
        success: true,
        message: 'Backup created successfully',
        backupPath,
        size: stats.size,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Backup failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async restoreBackup(backupPath: string, targetTenantId?: string): Promise<RestoreResult> {
    const errors: string[] = [];
    let totalRecords = 0;

    try {
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: 'Backup file not found',
          errors: [`Backup file ${backupPath} does not exist`],
        };
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      const tenantId = targetTenantId || backupData.tenantId;

      // Restore data from each table
      for (const [table, records] of Object.entries(backupData.tables)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        try {
          for (const record of records as any[]) {
            // Use target tenant ID if provided
            record.tenant_id = tenantId;

            // Remove auto-generated fields
            delete record.id;
            delete record.created_at;
            delete record.updated_at;

            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            await this.dataSource.query(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) 
               ON CONFLICT DO NOTHING`,
              values,
            );

            totalRecords++;
          }

          this.logger.log(`Restored ${records.length} records to ${table}`);
        } catch (error: any) {
          const errorMsg = `Failed to restore to ${table}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Restore completed with errors',
          recordsRestored: totalRecords,
          errors,
        };
      }

      return {
        success: true,
        message: 'Restore completed successfully',
        recordsRestored: totalRecords,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  async listBackups(tenantId?: string): Promise<string[]> {
    const files = fs.readdirSync(this.backupDir);
    
    if (tenantId) {
      return files
        .filter(file => file.startsWith(`tenant-${tenantId}-`))
        .map(file => path.join(this.backupDir, file));
    }

    return files
      .filter(file => file.startsWith('tenant-'))
      .map(file => path.join(this.backupDir, file));
  }

  async deleteBackup(backupPath: string): Promise<boolean> {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        this.logger.log(`Deleted backup: ${backupPath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete backup ${backupPath}: ${error}`);
      return false;
    }
  }

  async scheduleBackup(tenantId: string, cronExpression: string): Promise<void> {
    // This would integrate with a scheduler like @nestjs/schedule
    // For now, it's a placeholder for future implementation
    this.logger.log(`Scheduled backup for tenant ${tenantId} with cron: ${cronExpression}`);
  }

  async cleanupOldBackups(tenantId: string, keepCount: number = 5): Promise<number> {
    const backups = await this.listBackups(tenantId);
    
    // Sort by modification time (newest first)
    backups.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtimeMs - statA.mtimeMs;
    });

    // Delete old backups beyond keepCount
    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      if (await this.deleteBackup(backup)) {
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old backups for tenant ${tenantId}`);
    return deletedCount;
  }

  async getBackupInfo(backupPath: string): Promise<any> {
    try {
      if (!fs.existsSync(backupPath)) {
        return null;
      }

      const stats = fs.statSync(backupPath);
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      return {
        path: backupPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        tenantId: backupData.tenantId,
        backupDate: backupData.backupDate,
        tables: Object.keys(backupData.tables),
        recordCounts: Object.fromEntries(
          Object.entries(backupData.tables).map(([table, records]) => [
            table,
            Array.isArray(records) ? records.length : 0,
          ]),
        ),
      };
    } catch (error) {
      this.logger.error(`Failed to get backup info for ${backupPath}: ${error}`);
      return null;
    }
  }
}
