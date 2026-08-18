import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleAnalytics } from '../entities/rule-analytics.entity';
import { RulesEngineService } from './rules-engine.service';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    private rulesEngineService: RulesEngineService,
    @InjectRepository(RuleAnalytics)
    private ruleAnalyticsRepository: Repository<RuleAnalytics>,
  ) {}

  async evaluateTransaction(transaction: any, merchantId: string, userId?: string) {
    return this.rulesEngineService.evaluateRules(transaction, merchantId, userId);
  }

  async getRuleAnalytics(ruleId: string, days: number = 30) {
    return this.rulesEngineService.getRuleAnalytics(ruleId, days);
  }

  async getMerchantAnalytics(merchantId: string, days: number = 30) {
    return this.rulesEngineService.getAnalyticsByMerchant(merchantId, days);
  }

  async getGlobalAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.ruleAnalyticsRepository.find({
      where: {
        date: { $gte: startDate } as any,
      },
      order: { date: 'ASC' },
    });
  }
}
