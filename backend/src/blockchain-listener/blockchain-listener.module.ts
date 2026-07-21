import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainListenerService } from './blockchain-listener.service';
import { Payment } from '../payment/entities/payment.entity';
import { Merchant } from '../payment/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Merchant])],
  providers: [BlockchainListenerService],
  exports: [BlockchainListenerService],
})
export class BlockchainListenerModule {}
