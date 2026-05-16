import { RolesGuard } from '../roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (roles: string[] | null, requiredRoles?: string[]) => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: roles ? { roles } : null,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    reflector.getAllAndOverride = jest.fn().mockReturnValue(requiredRoles);
    return ctx;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    const ctx = mockContext(['COPYWRITER'], undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when empty roles array', () => {
    const ctx = mockContext(['COPYWRITER'], []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const ctx = mockContext(['ADMIN'], ['ADMIN', 'STRATEGIST']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow when user has one of multiple required roles', () => {
    const ctx = mockContext(['STRATEGIST'], ['ADMIN', 'STRATEGIST']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    const ctx = mockContext(['COPYWRITER'], ['ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should deny access when user has no roles', () => {
    const ctx = mockContext(null, ['ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should handle multiple user roles correctly', () => {
    const ctx = mockContext(['COPYWRITER', 'DESIGNER'], ['DESIGNER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
