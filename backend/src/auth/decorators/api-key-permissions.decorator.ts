import { SetMetadata } from '@nestjs/common';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

export const API_KEY_PERMISSIONS_KEY = 'apiKeyPermissions';
export const RequireApiKeyPermissions = (...permissions: ApiKeyPermission[]) =>
  SetMetadata(API_KEY_PERMISSIONS_KEY, permissions);
