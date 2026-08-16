import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { LedgerController } from './controllers/ledger.controller';
import { LedgerService } from './services/ledger.service';
import { RaftConsensusService } from './services/raft-consensus.service';
import { MerkleTreeService } from './services/merkle-tree.service';
import { ReconciliationService } from './services/reconciliation.service';
import { ConflictResolutionService } from './services/conflict-resolution.service';
import { LedgerClientService } from './services/ledger-client.service';
import { LedgerHealthService } from './services/ledger-health.service';
import { LedgerPruningService } from './services/ledger-pruning.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { ReconciliationReport } from './entities/reconciliation-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntry, ReconciliationReport]),
    HttpModule,
    ScheduleModule,
  ],
  controllers: [LedgerController],
  providers: [
    LedgerService,
    RaftConsensusService,
    MerkleTreeService,
    ReconciliationService,
    ConflictResolutionService,
    LedgerClientService,
    LedgerHealthService,
    LedgerPruningService,
    DistributedLockService,
  ],
  exports: [
    LedgerService,
    RaftConsensusService,
    MerkleTreeService,
    ReconciliationService,
    ConflictResolutionService,
    LedgerClientService,
    LedgerHealthService,
    LedgerPruningService,
    DistributedLockService,
  ],
})
export class DistributedLedgerModule {}
