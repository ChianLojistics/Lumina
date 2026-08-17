import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRule, RulePriority } from '../entities/fraud-rule.entity';
import { RuleEvaluation } from '../entities/rule-evaluation.entity';
import { RuleAnalytics } from '../entities/rule-analytics.entity';
import {
  Condition,
  ConditionOperator,
  LogicalOperator,
  ConditionType,
  Action,
  ActionType,
  EvaluationContext,
  RuleResult,
  EvaluationResult,
  Rule,
  RuleConfig,
} from '../interfaces/rule.interfaces';
import { Redis } from 'ioredis';

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);
  private ruleCache: Map<string, Rule[]> = new Map();
  private cacheTTL = 300000; // 5 minutes

  constructor(
    @InjectRepository(FraudRule)
    private fraudRuleRepository: Repository<FraudRule>,
    @InjectRepository(RuleEvaluation)
    private ruleEvaluationRepository: Repository<RuleEvaluation>,
    @InjectRepository(RuleAnalytics)
    private ruleAnalyticsRepository: Repository<RuleAnalytics>,
    private redis: Redis,
  ) {}

  async evaluateRules(
    transaction: any,
    merchantId: string,
    userId?: string,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const context: EvaluationContext = {
      transaction,
      merchantId,
      userId,
      timestamp: new Date(),
    };

    const rules = await this.getRulesForMerchant(merchantId);
    const results: RuleResult[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const ruleStartTime = Date.now();
      const matched = await this.evaluateRuleConditions(rule.conditions, context);
      const evaluationTimeMs = Date.now() - ruleStartTime;

      // Record evaluation
      await this.recordEvaluation(rule.id, transaction.id || transaction.payment_id, merchantId, matched, evaluationTimeMs, context);

      if (matched) {
        // Execute actions
        for (const action of rule.actions) {
          await this.executeAction(action, context, rule);
        }

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          priority: rule.priority,
          actions: rule.actions,
          evaluationTimeMs,
        });

        // Stop evaluation if critical rule matched
        if (rule.priority === RulePriority.CRITICAL) {
          break;
        }
      }
    }

    const totalEvaluationTimeMs = Date.now() - startTime;

    return {
      transactionId: transaction.id || transaction.payment_id,
      merchantId,
      results,
      blocked: results.some((r) => r.priority === RulePriority.CRITICAL),
      flagged: results.some((r) => r.priority !== RulePriority.LOW),
      totalEvaluationTimeMs,
    };
  }

  async evaluateRuleConditions(
    conditions: Condition[],
    context: EvaluationContext,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return false;
    }

    // If single condition, evaluate directly
    if (conditions.length === 1) {
      return this.evaluateCondition(conditions[0], context);
    }

    // Multiple conditions - wrap in AND composite
    const compositeCondition: Condition = {
      type: ConditionType.COMPOSITE,
      logicalOperator: LogicalOperator.AND,
      conditions,
    };

    return this.evaluateCondition(compositeCondition, context);
  }

  async evaluateCondition(
    condition: Condition,
    context: EvaluationContext,
  ): Promise<boolean> {
    if (!condition.type || condition.type === ConditionType.SIMPLE) {
      return this.evaluateSimpleCondition(condition, context);
    }

    if (condition.type === ConditionType.COMPOSITE) {
      return this.evaluateCompositeCondition(condition, context);
    }

    return false;
  }

  private async evaluateSimpleCondition(
    condition: Condition,
    context: EvaluationContext,
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(context.transaction, condition.field!);
    const operator = condition.operator;

    switch (operator) {
      case ConditionOperator.EQ:
        return fieldValue === condition.value;
      case ConditionOperator.NE:
        return fieldValue !== condition.value;
      case ConditionOperator.GT:
        return this.compareNumbers(fieldValue, condition.value, (a, b) => a > b);
      case ConditionOperator.LT:
        return this.compareNumbers(fieldValue, condition.value, (a, b) => a < b);
      case ConditionOperator.GTE:
        return this.compareNumbers(fieldValue, condition.value, (a, b) => a >= b);
      case ConditionOperator.LTE:
        return this.compareNumbers(fieldValue, condition.value, (a, b) => a <= b);
      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case ConditionOperator.NOT_IN:
        return !Array.isArray(condition.value) || !condition.value.includes(fieldValue);
      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(condition.value));
      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).startsWith(String(condition.value));
      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).endsWith(String(condition.value));
      case ConditionOperator.REGEX:
        try {
          const regex = new RegExp(condition.value);
          return regex.test(String(fieldValue));
        } catch (error) {
          this.logger.error(`Invalid regex pattern: ${condition.value}`, error);
          return false;
        }
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private async evaluateCompositeCondition(
    condition: Condition,
    context: EvaluationContext,
  ): Promise<boolean> {
    if (!condition.conditions || condition.conditions.length === 0) {
      return false;
    }

    const logicalOperator = condition.logicalOperator || LogicalOperator.AND;
    const results = await Promise.all(
      condition.conditions.map((c) => this.evaluateCondition(c, context)),
    );

    switch (logicalOperator) {
      case LogicalOperator.AND:
        return results.every((r) => r);
      case LogicalOperator.OR:
        return results.some((r) => r);
      case LogicalOperator.NOT:
        return !results[0];
      default:
        return results.every((r) => r);
    }
  }

  private compareNumbers(
    fieldValue: any,
    compareValue: any,
    comparison: (a: number, b: number) => boolean,
  ): boolean {
    const fieldNum = parseFloat(fieldValue);
    const compareNum = parseFloat(compareValue);

    if (isNaN(fieldNum) || isNaN(compareNum)) {
      return false;
    }

    return comparison(fieldNum, compareNum);
  }

  private getFieldValue(transaction: any, field: string): any {
    if (!field) return undefined;
    
    // Support nested field access (e.g., "user.country", "amount")
    return field.split('.').reduce((obj, key) => obj?.[key], transaction);
  }

  private async executeAction(
    action: Action,
    context: EvaluationContext,
    rule: Rule,
  ): Promise<void> {
    // Actions are executed by the calling service (payment service, etc.)
    // This method just logs the action for now
    this.logger.log(
      `Executing action ${action.type} for rule ${rule.id} on transaction ${context.transaction.id || context.transaction.payment_id}`,
    );
  }

  async getRulesForMerchant(merchantId: string): Promise<Rule[]> {
    // Check cache first
    const cacheKey = `rules:${merchantId}`;
    const cached = this.ruleCache.get(cacheKey);
    if (cached) return cached;

    // Try Redis cache
    const redisCached = await this.redis.get(cacheKey);
    if (redisCached) {
      const rules = JSON.parse(redisCached);
      this.ruleCache.set(cacheKey, rules);
      return rules;
    }

    // Load from database
    const fraudRules = await this.fraudRuleRepository.find({
      where: [
        { merchant_id: merchantId, enabled: true },
        { merchant_id: null as any, enabled: true }, // Global rules
      ],
      order: { priority: 'DESC' },
    });

    const rules: Rule[] = fraudRules.map((fr) => ({
      id: fr.id,
      name: fr.name,
      description: fr.description || '',
      enabled: fr.enabled,
      priority: fr.priority,
      conditions: fr.rule_config.conditions || [],
      actions: fr.rule_config.actions || [],
    }));

    // Cache the rules
    this.ruleCache.set(cacheKey, rules);
    await this.redis.setex(cacheKey, this.cacheTTL / 1000, JSON.stringify(rules));

    return rules;
  }

  async reloadRules(merchantId: string): Promise<void> {
    const cacheKey = `rules:${merchantId}`;
    this.ruleCache.delete(cacheKey);
    await this.redis.del(cacheKey);
    await this.getRulesForMerchant(merchantId);
  }

  async reloadAllRules(): Promise<void> {
    this.ruleCache.clear();
    const keys = await this.redis.keys('rules:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async recordEvaluation(
    ruleId: string,
    transactionId: string,
    merchantId: string,
    matched: boolean,
    evaluationTimeMs: number,
    context: EvaluationContext,
  ): Promise<void> {
    try {
      await this.ruleEvaluationRepository.save({
        rule_id: ruleId,
        transaction_id: transactionId,
        merchant_id: merchantId,
        matched,
        evaluation_time_ms: evaluationTimeMs,
        evaluation_context: context,
      });

      // Update analytics asynchronously
      this.updateAnalytics(ruleId, merchantId, matched, evaluationTimeMs).catch((error) => {
        this.logger.error(`Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`);
      });
    } catch (error) {
      this.logger.error(`Failed to record evaluation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateAnalytics(
    ruleId: string,
    merchantId: string,
    matched: boolean,
    evaluationTimeMs: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await this.ruleAnalyticsRepository.findOne({
      where: { rule_id: ruleId, date: today as any },
    });

    if (!analytics) {
      analytics = this.ruleAnalyticsRepository.create({
        rule_id: ruleId,
        merchant_id: merchantId,
        date: today,
        total_evaluations: 0,
        total_matches: 0,
        match_rate: 0,
        avg_evaluation_time_ms: 0,
      });
    }

    analytics.total_evaluations++;
    if (matched) {
      analytics.total_matches++;
    }

    analytics.match_rate = (analytics.total_matches / analytics.total_evaluations) * 100;
    
    // Update average evaluation time using moving average
    const currentAvg = analytics.avg_evaluation_time_ms || 0;
    analytics.avg_evaluation_time_ms = Math.round(
      (currentAvg * (analytics.total_evaluations - 1) + evaluationTimeMs) / analytics.total_evaluations,
    );

    await this.ruleAnalyticsRepository.save(analytics);
  }

  async getRuleAnalytics(ruleId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.ruleAnalyticsRepository.find({
      where: {
        rule_id: ruleId,
        date: { $gte: startDate } as any,
      },
      order: { date: 'ASC' },
    });
  }

  async getAnalyticsByMerchant(merchantId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.ruleAnalyticsRepository.find({
      where: {
        merchant_id: merchantId,
        date: { $gte: startDate } as any,
      },
      order: { date: 'ASC' },
    });
  }
}
