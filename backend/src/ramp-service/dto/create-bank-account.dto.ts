import { IsNotEmpty, IsString, IsEnum, MinLength, MaxLength, IsOptional } from 'class-validator';
import { BankAccountType } from '../entities/bank-account.entity';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  account_holder_name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  @MaxLength(12)
  routing_number: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(BankAccountType)
  @IsNotEmpty()
  account_type: BankAccountType;

  @IsString()
  @IsOptional()
  plaid_public_token?: string;

  @IsString()
  @IsOptional()
  plaid_account_id?: string;
}
