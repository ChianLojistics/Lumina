import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWN_RESOURCE_PARAM_KEY } from '../decorators/own-resource.decorator';
import { Role } from '../enums/role.enum';
import { AuthenticatedRequest } from '../interfaces/jwt-payload.interface';
import { AuthorizationException } from '../../common/exceptions';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const paramName = this.reflector.getAllAndOverride<string>(OWN_RESOURCE_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!paramName) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;

    if (!user) {
      throw new AuthorizationException('Authentication required to access this resource');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const requestedId = request.params?.[paramName];

    if (!user.merchantId || requestedId !== user.merchantId) {
      throw new AuthorizationException('You do not own this resource');
    }

    return true;
  }
}
