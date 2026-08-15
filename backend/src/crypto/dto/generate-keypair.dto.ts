import { IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { PQCAlgorithm } from '../interfaces/hybrid-key-exchange.interface';

export class GenerateKeypairDto {
  @IsEnum(PQCAlgorithm)
  algorithm: PQCAlgorithm;

  @IsEnum(['key-exchange', 'signature', 'encryption'])
  keyType: 'key-exchange' | 'signature' | 'encryption';

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
