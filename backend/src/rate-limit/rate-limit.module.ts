import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitPolicyEntity } from './entities/rate-limit-policy.entity';
import { RateLimitViolationEntity } from './entities/rate-limit-violation.entity';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitPolicyService } from './services/rate-limit-policy.service';
import { RateLimitController } from './controllers/rate-limit.controller';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { RateLimitMonitoringService } from './services/rate-limit-monitoring.service';
import { RateLimitAlgorithmService } from './services/rate-limit-algorithm.service';
import { RateLimitChallengeService } from './services/rate-limit-challenge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RateLimitPolicyEntity,
      RateLimitViolationEntity,
    ]),
  ],
  controllers: [RateLimitController],
  providers: [
    RateLimitService,
    RateLimitPolicyService,
    RateLimitMonitoringService,
    RateLimitAlgorithmService,
    RateLimitChallengeService,
    RateLimitMiddleware,
  ],
  exports: [
    RateLimitService,
    RateLimitPolicyService,
    RateLimitMonitoringService,
    RateLimitAlgorithmService,
    RateLimitChallengeService,
    RateLimitMiddleware,
  ],
})
export class RateLimitModule {}
