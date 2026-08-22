import { SetMetadata } from '@nestjs/common';
import { TenantUserRole } from '../entities/tenant-user.entity';

export const TENANT_ROLES_KEY = 'tenantRoles';

export const TenantRoles = (...roles: TenantUserRole[]) => SetMetadata(TENANT_ROLES_KEY, roles);
