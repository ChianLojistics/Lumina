import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

/**
 * Static assignment of permissions per role. `PermissionsGuard` consults this
 * map so route handlers can require a `Permission` without hardcoding which
 * roles happen to grant it today.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.MERCHANT]: [
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_WRITE,
    Permission.MERCHANTS_READ,
    Permission.MERCHANTS_WRITE,
    Permission.API_KEYS_MANAGE,
  ],
  [Role.CUSTOMER]: [Permission.PAYMENTS_READ],
};
