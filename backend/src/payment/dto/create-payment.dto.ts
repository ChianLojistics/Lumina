import { IsNotEmpty, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentCurrency } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Stellar address of the merchant receiving payment', example: 'GAXHWJ7...EXAMPLE' })
  @IsString()
  @IsNotEmpty()
  merchant_address: string;

  @ApiProperty({ description: 'Payment amount', example: 100.50, minimum: 0.01 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Currency code', enum: PaymentCurrency, example: PaymentCurrency.USD })
  @IsEnum(PaymentCurrency)
  @IsNotEmpty()
  currency: PaymentCurrency;
}
