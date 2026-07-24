import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';
import { ROLE_PERMISSIONS } from '../constants/role-permissions.map';
import { AuthenticatedRequest } from '../interfaces/jwt-payload.interface';
import { AuthorizationException } from '../../common/exceptions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const grantedPermissions = user ? ROLE_PERMISSIONS[user.role] : [];

    const hasAll = requiredPermissions.every((permission) => grantedPermissions.includes(permission));

    if (!hasAll) {
      throw new AuthorizationException('This action requires additional permissions');
    }

    return true;
  }
}
