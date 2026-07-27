import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { CryptoAsset } from '../entities/ramp-operation.entity';

export class InitiateOffRampDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  crypto_amount: number;

  @IsEnum(CryptoAsset)
  @IsNotEmpty()
  crypto_asset: CryptoAsset;

  @IsString()
  @IsNotEmpty()
  bank_account_id: string;

  @IsString()
  @IsOptional()
  target_currency?: string;

  @IsString()
  @IsOptional()
  kyc_reference_id?: string;
}
