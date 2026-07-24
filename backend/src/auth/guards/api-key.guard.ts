import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../services/api-key.service';
import { API_KEY_PERMISSIONS_KEY } from '../decorators/api-key-permissions.decorator';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
import { AuthenticatedRequest } from '../interfaces/jwt-payload.interface';
import { AuthenticationException, AuthorizationException } from '../../common/exceptions';

const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawApiKey = request.headers[API_KEY_HEADER] as string;

    if (!rawApiKey) {
      throw AuthenticationException.apiKeyInvalid();
    }

    const apiKey = await this.apiKeyService.validate(rawApiKey);

    const requiredPermissions = this.reflector.getAllAndOverride<ApiKeyPermission[]>(
      API_KEY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions?.length) {
      const hasAll = requiredPermissions.every((permission) =>
        apiKey.permissions.includes(permission) || apiKey.permissions.includes(ApiKeyPermission.ADMIN),
      );

      if (!hasAll) {
        throw new AuthorizationException('This API key lacks the required permissions');
      }
    }

    request.apiKey = {
      id: apiKey.id,
      merchantId: apiKey.merchant_id,
      permissions: apiKey.permissions,
    };

    return true;
  }
}
