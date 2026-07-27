import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RampService } from './ramp-service.service';
import { RampController } from './ramp-service.controller';
import { RampOperation } from './entities/ramp-operation.entity';
import { BankAccount } from './entities/bank-account.entity';
import { KycRecord } from './entities/kyc-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RampOperation, BankAccount, KycRecord]),
  ],
  controllers: [RampController],
  providers: [RampService],
  exports: [RampService],
})
export class RampModule {}
