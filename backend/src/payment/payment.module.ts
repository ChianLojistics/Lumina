import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { Merchant } from './entities/merchant.entity';
import { ConversionEngineModule } from '../conversion-engine/conversion-engine.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Merchant]), ConversionEngineModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
