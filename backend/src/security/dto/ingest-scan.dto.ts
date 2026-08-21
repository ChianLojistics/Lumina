import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { VulnerabilityType } from '../entities/vulnerability.entity';

export enum ScanFormat {
  SARIF = 'SARIF',
  NPM_AUDIT = 'NPM_AUDIT',
  GITLEAKS = 'GITLEAKS',
}

export class IngestScanDto {
  @IsEnum(ScanFormat)
  format!: ScanFormat;

  // Only used for SARIF payloads, where the tool doesn't imply a single vulnerability type
  // (e.g. Trivy emits both dependency and container findings via SARIF).
  @IsOptional()
  @IsEnum(VulnerabilityType)
  type?: VulnerabilityType;

  @IsObject()
  payload!: any;
}
