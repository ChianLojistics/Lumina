import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PQCryptoKey } from './entities/pq-crypto-key.entity';
import { CryptoOperation } from './entities/crypto-operation.entity';
import { CryptoController } from './crypto.controller';
import { HybridKeyExchangeService } from './services/hybrid-key-exchange.service';
import { PQSignatureService } from './services/pq-signature.service';
import { QuantumEncryptionService } from './services/quantum-encryption.service';
import { CryptoAgilityService } from './services/crypto-agility.service';
import { PQKeyManagementService } from './services/pq-key-management.service';
import { PQBenchmarkService } from './services/pq-benchmark.service';
import { PQMigrationService } from './services/pq-migration.service';
import { PQMonitoringService } from './services/pq-monitoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([PQCryptoKey, CryptoOperation])],
  controllers: [CryptoController],
  providers: [
    HybridKeyExchangeService,
    PQSignatureService,
    QuantumEncryptionService,
    CryptoAgilityService,
    PQKeyManagementService,
    PQBenchmarkService,
    PQMigrationService,
    PQMonitoringService,
  ],
  exports: [
    HybridKeyExchangeService,
    PQSignatureService,
    QuantumEncryptionService,
    CryptoAgilityService,
    PQKeyManagementService,
    PQBenchmarkService,
    PQMigrationService,
    PQMonitoringService,
  ],
})
export class CryptoModule {}
