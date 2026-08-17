import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZKPProofService } from './services/zkp-proof.service';
import { ZKPVerificationService } from './services/zkp-verification.service';
import { PrivacyAuditService } from './services/privacy-audit.service';
import { ZKPController } from './zkp.controller';
import { ZKPProof } from './entities/zkp-proof.entity';
import { Nullifier } from './entities/nullifier.entity';
import { AuditProof } from './entities/audit-proof.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZKPProof, Nullifier, AuditProof]),
  ],
  controllers: [ZKPController],
  providers: [
    ZKPProofService,
    ZKPVerificationService,
    PrivacyAuditService,
  ],
  exports: [
    ZKPProofService,
    ZKPVerificationService,
    PrivacyAuditService,
  ],
})
export class ZKPModule {}
