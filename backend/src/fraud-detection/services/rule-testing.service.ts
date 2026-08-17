import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRule } from '../entities/fraud-rule.entity';
import { TestRuleDto } from '../dto/test-rule.dto';
import { RulesEngineService } from './rules-engine.service';
import { EvaluationContext, Condition, TestResult, TestResultItem } from '../interfaces/rule.interfaces';

@Injectable()
export class RuleTestingService {
  private readonly logger = new Logger(RuleTestingService.name);

  constructor(
    @InjectRepository(FraudRule)
    private fraudRuleRepository: Repository<FraudRule>,
    private rulesEngineService: RulesEngineService,
  ) {}

  async testRule(ruleId: string, testRuleDto: TestRuleDto): Promise<TestResult> {
    const rule = await this.fraudRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    const results: TestResultItem[] = [];

    for (const testData of testRuleDto.testData) {
      const context: EvaluationContext = {
        transaction: testData.data,
        merchantId: rule.merchant_id || 'test',
        timestamp: new Date(),
      };

      const matched = await this.rulesEngineService.evaluateRuleConditions(
        rule.rule_config.conditions as Condition[],
        context,
      );

      results.push({
        transactionId: testData.id,
        matched,
        expected: testData.expectedMatch,
        correct: matched === testData.expectedMatch,
        description: testData.description,
      });
    }

    const correctTests = results.filter((r) => r.correct).length;
    const accuracy = results.length > 0 ? correctTests / results.length : 0;

    return {
      ruleId,
      totalTests: results.length,
      correctTests,
      accuracy,
      results,
    };
  }

  async validateRuleConfig(ruleConfig: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!ruleConfig.conditions || !Array.isArray(ruleConfig.conditions)) {
      errors.push('Conditions must be an array');
    } else {
      this.validateConditions(ruleConfig.conditions, errors, 'conditions');
    }

    if (!ruleConfig.actions || !Array.isArray(ruleConfig.actions)) {
      errors.push('Actions must be an array');
    } else {
      this.validateActions(ruleConfig.actions, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateConditions(conditions: any[], errors: string[], path: string): void {
    conditions.forEach((condition, index) => {
      const currentPath = `${path}[${index}]`;

      if (!condition.operator) {
        errors.push(`${currentPath}: operator is required`);
      }

      if (condition.type === 'COMPOSITE') {
        if (!condition.conditions || !Array.isArray(condition.conditions)) {
          errors.push(`${currentPath}: composite conditions must have an array of conditions`);
        } else {
          this.validateConditions(condition.conditions, errors, `${currentPath}.conditions`);
        }
      } else if (condition.type !== 'COMPOSITE') {
        if (!condition.field) {
          errors.push(`${currentPath}: field is required for simple conditions`);
        }
      }
    });
  }

  private validateActions(actions: any[], errors: string[]): void {
    actions.forEach((action, index) => {
      if (!action.type) {
        errors.push(`actions[${index}]: type is required`);
      }
    });
  }
}
