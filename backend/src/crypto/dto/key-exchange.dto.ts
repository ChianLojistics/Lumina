import { IsUUID, IsOptional, IsString } from 'class-validator';

export class KeyExchangeDto {
  @IsUUID()
  peerPublicKeyId: string;

  @IsOptional()
  useHybrid?: boolean;
}

export class EncapsulateDto {
  @IsUUID()
  peerPublicKeyId: string;
}

export class DecapsulateDto {
  @IsString()
  ciphertext: string;

  @IsUUID()
  privateKeyId: string;
}
