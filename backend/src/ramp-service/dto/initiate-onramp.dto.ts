import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { PaymentMethod, CryptoAsset } from '../entities/ramp-operation.entity';

export class InitiateOnRampDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  fiat_amount: number;

  @IsString()
  @IsNotEmpty()
  fiat_currency: string;

  @IsEnum(CryptoAsset)
  @IsNotEmpty()
  target_asset: CryptoAsset;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method: PaymentMethod;

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
