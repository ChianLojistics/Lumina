import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { EncryptionAlgorithm } from '../interfaces/encryption.interface';

export class EncryptDto {
  @IsString()
  plaintext: string;

  @IsOptional()
  @IsUUID()
  keyId?: string;

  @IsOptional()
  @IsEnum(EncryptionAlgorithm)
  algorithm?: EncryptionAlgorithm;

  @IsOptional()
  usePQCKey?: boolean;
}

export class DecryptDto {
  @IsString()
  ciphertext: string;

  @IsString()
  nonce: string;

  @IsString()
  algorithm: string;

  @IsOptional()
  @IsUUID()
  keyId?: string;

  @IsOptional()
  usePQCKey?: boolean;
}
