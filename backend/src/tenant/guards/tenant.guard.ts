import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantUserRole } from '../entities/tenant-user.entity';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Check if tenant is set in request
    if (!request.tenant) {
      throw new ForbiddenException('Tenant context not found');
    }

    // Check if user belongs to the tenant
    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    // For now, we'll allow access if tenant is set
    // In production, you would check tenant_users table for user's role
    return true;
  }
}

@Injectable()
export class TenantRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<TenantUserRole[]>('tenantRoles', context.getHandler());
    
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.tenantRole;

    if (!userRole) {
      throw new ForbiddenException('User does not have a tenant role');
    }

    return requiredRoles.includes(userRole);
  }
}
