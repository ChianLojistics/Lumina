import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, CryptoAsset } from '../entities/ramp-operation.entity';

export class InitiateOnRampDto {
  @ApiProperty({ description: 'User ID', example: 'user_abc123' })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Fiat amount to convert', example: 100, minimum: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  fiat_amount: number;

  @ApiProperty({ description: 'Fiat currency code', example: 'USD' })
  @IsString()
  @IsNotEmpty()
  fiat_currency: string;

  @ApiProperty({ description: 'Target cryptocurrency', enum: CryptoAsset, example: CryptoAsset.XLM })
  @IsEnum(CryptoAsset)
  @IsNotEmpty()
  target_asset: CryptoAsset;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method: PaymentMethod;

  @ApiProperty({ description: 'Stellar wallet address to receive crypto', example: 'GAXHWJ7...' })
  @IsString()
  @IsNotEmpty()
  wallet_address: string;

  @IsString()
  @IsOptional()
  kyc_reference_id?: string;

  @IsString()
  @IsOptional()
  redirect_url?: string;

  @IsString()
  @IsOptional()
  cancel_url?: string;
}
