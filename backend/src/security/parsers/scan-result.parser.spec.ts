import { ScanResultParser } from './scan-result.parser';
import { VulnerabilitySeverity, VulnerabilitySource, VulnerabilityType } from '../entities/vulnerability.entity';

describe('ScanResultParser', () => {
  let parser: ScanResultParser;

  beforeEach(() => {
    parser = new ScanResultParser();
  });

  describe('parseSarif', () => {
    it('maps SARIF results into vulnerabilities using security-severity when present', () => {
      const sarif = {
        runs: [
          {
            tool: { driver: { name: 'Semgrep' } },
            results: [
              {
                ruleId: 'no-hardcoded-secrets',
                level: 'error',
                message: { text: 'Hardcoded secret detected' },
                properties: { 'security-severity': '9.5' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/payment/payment.service.ts' },
                      region: { startLine: 42 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const [finding] = parser.parseSarif(sarif, VulnerabilitySource.SEMGREP, VulnerabilityType.CODE);

      expect(finding.severity).toBe(VulnerabilitySeverity.CRITICAL);
      expect(finding.affected_component).toBe('src/payment/payment.service.ts');
      expect(finding.location).toBe('src/payment/payment.service.ts:42');
      expect(finding.description).toBe('Hardcoded secret detected');
    });

    it('falls back to SARIF level when no security-severity score is provided', () => {
      const sarif = {
        runs: [
          {
            tool: { driver: { name: 'Semgrep' } },
            results: [
              { ruleId: 'weak-crypto', level: 'warning', message: { text: 'Weak cryptographic algorithm' } },
            ],
          },
        ],
      };

      const [finding] = parser.parseSarif(sarif, VulnerabilitySource.SEMGREP, VulnerabilityType.CODE);

      expect(finding.severity).toBe(VulnerabilitySeverity.MEDIUM);
      expect(finding.cvss_score).toBeUndefined();
    });

    it('extracts a CVE id from the rule id or message when present', () => {
      const sarif = {
        runs: [
          {
            tool: { driver: { name: 'Trivy' } },
            results: [
              {
                ruleId: 'CVE-2023-12345',
                level: 'error',
                message: { text: 'Vulnerable base image layer' },
                locations: [{ physicalLocation: { artifactLocation: { uri: 'Dockerfile' } } }],
              },
            ],
          },
        ],
      };

      const [finding] = parser.parseSarif(sarif, VulnerabilitySource.TRIVY, VulnerabilityType.CONTAINER);

      expect(finding.cve_id).toBe('CVE-2023-12345');
    });

    it('produces the same fingerprint for identical findings so re-scans dedupe', () => {
      const sarif = {
        runs: [
          {
            tool: { driver: { name: 'Semgrep' } },
            results: [
              {
                ruleId: 'sql-injection',
                level: 'error',
                message: { text: 'Potential SQL injection' },
                locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.ts' }, region: { startLine: 10 } } }],
              },
            ],
          },
        ],
      };

      const first = parser.parseSarif(sarif, VulnerabilitySource.SEMGREP, VulnerabilityType.CODE);
      const second = parser.parseSarif(sarif, VulnerabilitySource.SEMGREP, VulnerabilityType.CODE);

      expect(first[0].fingerprint).toEqual(second[0].fingerprint);
    });

    it('returns an empty array when there are no runs', () => {
      expect(parser.parseSarif({}, VulnerabilitySource.SEMGREP, VulnerabilityType.CODE)).toEqual([]);
    });
  });

  describe('parseNpmAudit', () => {
    it('maps npm audit v2 vulnerabilities into findings', () => {
      const report = {
        vulnerabilities: {
          lodash: {
            name: 'lodash',
            severity: 'high',
            range: '<4.17.21',
            via: [{ title: 'Prototype Pollution in lodash', cve: ['CVE-2021-23337'], url: 'https://example.com' }],
            fixAvailable: { name: 'lodash', version: '4.17.21' },
          },
        },
      };

      const [finding] = parser.parseNpmAudit(report);

      expect(finding.severity).toBe(VulnerabilitySeverity.HIGH);
      expect(finding.type).toBe(VulnerabilityType.DEPENDENCY);
      expect(finding.affected_component).toBe('lodash@<4.17.21');
      expect(finding.cve_id).toBe('CVE-2021-23337');
      expect(finding.remediation).toContain('npm audit fix');
    });

    it('returns an empty array when there are no vulnerabilities', () => {
      expect(parser.parseNpmAudit({ vulnerabilities: {} })).toEqual([]);
    });
  });

  describe('parseGitleaks', () => {
    it('treats every leaked secret as a critical finding', () => {
      const report = [
        { RuleID: 'stripe-api-key', File: '.env', StartLine: 3, Description: 'Stripe API key' },
      ];

      const [finding] = parser.parseGitleaks(report);

      expect(finding.severity).toBe(VulnerabilitySeverity.CRITICAL);
      expect(finding.type).toBe(VulnerabilityType.SECRET);
      expect(finding.location).toBe('.env:3');
    });

    it('returns an empty array for a non-array payload', () => {
      expect(parser.parseGitleaks(null as any)).toEqual([]);
    });
  });
});
