import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  VulnerabilitySeverity,
  VulnerabilitySource,
  VulnerabilityType,
} from '../entities/vulnerability.entity';

export interface ParsedVulnerability {
  severity: VulnerabilitySeverity;
  type: VulnerabilityType;
  source: VulnerabilitySource;
  description: string;
  affected_component: string;
  location?: string;
  cve_id?: string;
  cvss_score?: number;
  remediation?: string;
  fingerprint: string;
}

const CVE_PATTERN = /CVE-\d{4}-\d{4,}/i;

function fingerprint(parts: (string | undefined)[]): string {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function severityFromCvss(score: number): VulnerabilitySeverity {
  if (score >= 9) return VulnerabilitySeverity.CRITICAL;
  if (score >= 7) return VulnerabilitySeverity.HIGH;
  if (score >= 4) return VulnerabilitySeverity.MEDIUM;
  if (score > 0) return VulnerabilitySeverity.LOW;
  return VulnerabilitySeverity.INFO;
}

function severityFromSarifLevel(level: string | undefined): VulnerabilitySeverity {
  switch (level) {
    case 'error':
      return VulnerabilitySeverity.HIGH;
    case 'warning':
      return VulnerabilitySeverity.MEDIUM;
    case 'note':
      return VulnerabilitySeverity.LOW;
    default:
      return VulnerabilitySeverity.MEDIUM;
  }
}

function severityFromNpmAudit(severity: string | undefined): VulnerabilitySeverity {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
      return VulnerabilitySeverity.CRITICAL;
    case 'high':
      return VulnerabilitySeverity.HIGH;
    case 'moderate':
      return VulnerabilitySeverity.MEDIUM;
    case 'low':
      return VulnerabilitySeverity.LOW;
    default:
      return VulnerabilitySeverity.INFO;
  }
}

@Injectable()
export class ScanResultParser {
  /**
   * Parses a SARIF report (Semgrep, Trivy, and OWASP ZAP's SARIF export all emit this format).
   */
  parseSarif(
    sarif: any,
    source: VulnerabilitySource,
    type: VulnerabilityType,
  ): ParsedVulnerability[] {
    const findings: ParsedVulnerability[] = [];
    const runs = sarif?.runs || [];

    for (const run of runs) {
      const results = run?.results || [];
      for (const result of results) {
        const ruleId: string = result.ruleId || 'unknown-rule';
        const message: string = result.message?.text || ruleId;
        const location = result.locations?.[0]?.physicalLocation;
        const uri: string | undefined = location?.artifactLocation?.uri;
        const line: number | undefined = location?.region?.startLine;
        const locationStr = uri ? `${uri}${line ? `:${line}` : ''}` : undefined;

        const securitySeverity = result.properties?.['security-severity'];
        const cvssScore = securitySeverity ? parseFloat(securitySeverity) : undefined;
        const severity =
          cvssScore !== undefined && !Number.isNaN(cvssScore)
            ? severityFromCvss(cvssScore)
            : severityFromSarifLevel(result.level);

        const cveMatch = `${ruleId} ${message}`.match(CVE_PATTERN);

        findings.push({
          severity,
          type,
          source,
          description: message,
          affected_component: uri || ruleId,
          location: locationStr,
          cve_id: cveMatch?.[0]?.toUpperCase(),
          cvss_score: cvssScore,
          remediation: result.fixes?.[0]?.description?.text,
          fingerprint: fingerprint([source, ruleId, uri, String(line)]),
        });
      }
    }

    return findings;
  }

  /**
   * Parses `npm audit --json` output (npm's "auditReportVersion": 2 schema).
   */
  parseNpmAudit(report: any): ParsedVulnerability[] {
    const findings: ParsedVulnerability[] = [];
    const vulnerabilities = report?.vulnerabilities || {};

    for (const [pkgName, entry] of Object.entries<any>(vulnerabilities)) {
      const via = Array.isArray(entry.via) ? entry.via : [];
      const advisories = via.filter((v: any) => typeof v === 'object');
      const description =
        advisories.map((a: any) => a.title).filter(Boolean).join('; ') ||
        `Vulnerable dependency: ${pkgName}`;
      const cveId = advisories.map((a: any) => a.cve?.[0] || a.title).find((c: string) =>
        c ? CVE_PATTERN.test(c) : false,
      );
      const url = advisories.find((a: any) => a.url)?.url;

      findings.push({
        severity: severityFromNpmAudit(entry.severity),
        type: VulnerabilityType.DEPENDENCY,
        source: VulnerabilitySource.NPM_AUDIT,
        description,
        affected_component: `${pkgName}@${entry.range || 'unknown'}`,
        cve_id: cveId?.match(CVE_PATTERN)?.[0]?.toUpperCase(),
        remediation: entry.fixAvailable
          ? `Run \`npm audit fix\`${typeof entry.fixAvailable === 'object' ? ` (upgrade to ${entry.fixAvailable.name}@${entry.fixAvailable.version})` : ''}`
          : url,
        fingerprint: fingerprint([VulnerabilitySource.NPM_AUDIT, pkgName, entry.range]),
      });
    }

    return findings;
  }

  /**
   * Parses Gitleaks' JSON report (array of leaked-secret findings).
   */
  parseGitleaks(report: any[]): ParsedVulnerability[] {
    const items = Array.isArray(report) ? report : [];

    return items.map((finding) => {
      const file = finding.File || finding.file;
      const line = finding.StartLine ?? finding.startLine;
      const ruleId = finding.RuleID || finding.rule || 'secret';

      return {
        severity: VulnerabilitySeverity.CRITICAL,
        type: VulnerabilityType.SECRET,
        source: VulnerabilitySource.GITLEAKS,
        description: finding.Description || finding.description || `Secret detected: ${ruleId}`,
        affected_component: file || 'unknown-file',
        location: line ? `${file}:${line}` : file,
        remediation: 'Revoke the exposed secret immediately and remove it from git history.',
        fingerprint: fingerprint([VulnerabilitySource.GITLEAKS, ruleId, file, String(line)]),
      };
    });
  }
}
