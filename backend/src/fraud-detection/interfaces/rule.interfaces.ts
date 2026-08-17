import { RulePriority } from '../entities/fraud-rule.entity';

export enum ConditionOperator {
  EQ = 'EQ',
  NE = 'NE',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  REGEX = 'REGEX',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

export enum ConditionType {
  SIMPLE = 'SIMPLE',
  COMPOSITE = 'COMPOSITE',
}

export enum ActionType {
  ALERT = 'ALERT',
  BLOCK = 'BLOCK',
  REQUIRE_2FA = 'REQUIRE_2FA',
  FLAG = 'FLAG',
  LIMIT = 'LIMIT',
  CHALLENGE = 'CHALLENGE',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Condition {
  field?: string;
  operator?: ConditionOperator;
  value?: any;
  type?: ConditionType;
  window?: string;
  logicalOperator?: LogicalOperator;
  conditions?: Condition[];
}

export interface Action {
  type: ActionType;
  params?: Record<string, any>;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: RulePriority;
  conditions: Condition[];
  actions: Action[];
}

export interface RuleConfig {
  conditions: Condition[];
  actions: Action[];
}

export interface EvaluationContext {
  transaction: any;
  merchantId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  priority: RulePriority;
  actions: Action[];
  evaluationTimeMs: number;
}

export interface EvaluationResult {
  transactionId: string;
  merchantId: string;
  results: RuleResult[];
  blocked: boolean;
  flagged: boolean;
  totalEvaluationTimeMs: number;
}

export interface TestTransaction {
  id: string;
  data: Record<string, any>;
  expectedMatch: boolean;
  description?: string;
}

export interface TestResultItem {
  transactionId: string;
  matched: boolean;
  expected: boolean;
  correct: boolean;
  description?: string;
}

export interface TestResult {
  ruleId: string;
  totalTests: number;
  correctTests: number;
  accuracy: number;
  results: TestResultItem[];
}

export interface RuleAnalytics {
  ruleId: string;
  merchantId?: string;
  date: Date;
  totalEvaluations: number;
  totalMatches: number;
  matchRate: number;
  avgEvaluationTimeMs: number;
}

export interface RuleVersionInfo {
  version: number;
  ruleConfig: RuleConfig;
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
}
