import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainListenerService } from './blockchain-listener.service';
import { Payment } from '../payment/entities/payment.entity';
import { Merchant } from '../payment/entities/merchant.entity';
import { PaymentModule } from '../payment/payment.module';
import { NotificationServiceModule } from '../notification-service/notification-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Merchant]),
    PaymentModule,
    NotificationServiceModule,
  ],
  providers: [BlockchainListenerService],
  exports: [BlockchainListenerService],
})
export class BlockchainListenerModule {}
