import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudRule } from './entities/fraud-rule.entity';
import { RuleVersion } from './entities/rule-version.entity';
import { RuleEvaluation } from './entities/rule-evaluation.entity';
import { RuleAnalytics } from './entities/rule-analytics.entity';
import { RulesEngineService } from './services/rules-engine.service';
import { RuleManagementService } from './services/rule-management.service';
import { RuleTestingService } from './services/rule-testing.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { FraudDetectionController } from './controllers/fraud-detection.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FraudRule,
      RuleVersion,
      RuleEvaluation,
      RuleAnalytics,
    ]),
    CommonModule,
  ],
  controllers: [FraudDetectionController],
  providers: [
    RulesEngineService,
    RuleManagementService,
    RuleTestingService,
    FraudDetectionService,
  ],
  exports: [
    RulesEngineService,
    RuleManagementService,
    FraudDetectionService,
  ],
})
export class FraudDetectionModule {}
