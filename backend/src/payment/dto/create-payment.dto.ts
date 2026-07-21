import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';
import { PaymentCurrency } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  merchant_address: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PaymentCurrency)
  @IsNotEmpty()
  currency: PaymentCurrency;
}
