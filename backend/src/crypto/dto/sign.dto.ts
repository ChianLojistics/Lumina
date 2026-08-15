import { IsString, IsUUID, IsOptional } from 'class-validator';

export class SignDto {
  @IsString()
  message: string;

  @IsUUID()
  keyId: string;

  @IsOptional()
  useHybrid?: boolean;

  @IsOptional()
  @IsUUID()
  classicalKeyId?: string;
}

export class VerifyDto {
  @IsString()
  message: string;

  @IsUUID()
  keyId: string;

  @IsString()
  signature: string;

  @IsOptional()
  useHybrid?: boolean;

  @IsOptional()
  @IsUUID()
  classicalKeyId?: string;
}
