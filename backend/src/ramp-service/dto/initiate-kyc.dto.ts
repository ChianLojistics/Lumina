import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { KycProvider } from '../entities/kyc-record.entity';

export class InitiateKycDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  document_type?: string;

  @IsString()
  @IsOptional()
  document_number?: string;

  @IsEnum(KycProvider)
  @IsOptional()
  provider?: KycProvider;

  @IsString()
  @IsOptional()
  redirect_url?: string;
}
