import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createContext(user?: { role: Role }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const reflector = { getAllAndOverride: () => [Role.SUPER_ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ role: Role.SUPER_ADMIN }))).toBe(true);
  });

  it('blocks access when the user role is not among the required ones', () => {
    const reflector = { getAllAndOverride: () => [Role.SUPER_ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext({ role: Role.ADVISOR }))).toThrow(ForbiddenException);
  });

  it('blocks access when there is no authenticated user', () => {
    const reflector = { getAllAndOverride: () => [Role.SUPER_ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });
});
