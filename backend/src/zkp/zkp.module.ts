import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZKPProofService } from './services/zkp-proof.service';
import { ZKPVerificationService } from './services/zkp-verification.service';
import { PrivacyAuditService } from './services/privacy-audit.service';
import { ZKPCacheService } from './services/zkp-cache.service';
import { ZKPController } from './zkp.controller';
import { ZKPProof } from './entities/zkp-proof.entity';
import { Nullifier } from './entities/nullifier.entity';
import { AuditProof } from './entities/audit-proof.entity';
import { CacheModule } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZKPProof, Nullifier, AuditProof]),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ttl: 3600, // 1 hour cache
    }),
  ],
  controllers: [ZKPController],
  providers: [
    ZKPProofService,
    ZKPVerificationService,
    PrivacyAuditService,
    ZKPCacheService,
  ],
  exports: [
    ZKPProofService,
    ZKPVerificationService,
    PrivacyAuditService,
    ZKPCacheService,
  ],
})
export class ZKPModule {}
