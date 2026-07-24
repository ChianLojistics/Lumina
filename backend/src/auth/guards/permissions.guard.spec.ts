import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../enums/permission.enum';
import { Role } from '../enums/role.enum';
import { AuthorizationException } from '../../common/exceptions';

function createContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request through when no permissions are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({ role: Role.CUSTOMER }))).toBe(true);
  });

  it('allows an admin, who is granted every permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Permission.USERS_WRITE]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('throws when the role lacks the required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Permission.USERS_WRITE]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createContext({ role: Role.CUSTOMER }))).toThrow(
      AuthorizationException,
    );
  });

  it('allows a merchant to manage api keys per the role-permission map', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Permission.API_KEYS_MANAGE]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({ role: Role.MERCHANT }))).toBe(true);
  });
});
