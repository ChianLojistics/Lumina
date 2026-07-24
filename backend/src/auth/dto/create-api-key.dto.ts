import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];
}
