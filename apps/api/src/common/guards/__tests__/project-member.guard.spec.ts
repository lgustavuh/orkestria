import { ProjectMemberGuard } from '../project-member.guard';
import { PrismaService } from '../../../database/prisma.service';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectMemberGuard', () => {
  let guard: ProjectMemberGuard;
  const mockPrisma = {
    project: { findUnique: jest.fn() },
    projectMember: { findUnique: jest.fn() },
    clientUser: { findFirst: jest.fn() },
  };

  const makeCtx = (user: any, params: any = {}, body: any = {}) => ({
    switchToHttp: () => ({
      getRequest: () => ({ user, params, body }),
    }),
  }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new ProjectMemberGuard(mockPrisma as any);
    jest.clearAllMocks();
  });

  it('should allow ADMIN access to any project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', createdById: 'other', clientId: null });
    const result = await guard.canActivate(makeCtx({ sub: 'admin', roles: ['ADMIN'] }, { projectId: 'p1' }));
    expect(result).toBe(true);
  });

  it('should allow project creator', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', createdById: 'u1', clientId: null });
    const result = await guard.canActivate(makeCtx({ sub: 'u1', roles: ['STRATEGIST'] }, { projectId: 'p1' }));
    expect(result).toBe(true);
  });

  it('should allow project member', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', createdById: 'other', clientId: null });
    mockPrisma.projectMember.findUnique.mockResolvedValue({ userId: 'u1' });
    const result = await guard.canActivate(makeCtx({ sub: 'u1', roles: ['COPYWRITER'] }, { projectId: 'p1' }));
    expect(result).toBe(true);
  });

  it('should allow client user linked to project client', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', createdById: 'other', clientId: 'c1' });
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    mockPrisma.clientUser.findFirst.mockResolvedValue({ userId: 'u1', clientId: 'c1' });
    const result = await guard.canActivate(makeCtx({ sub: 'u1', roles: ['CLIENT'] }, { projectId: 'p1' }));
    expect(result).toBe(true);
  });

  it('should deny non-member access', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', createdById: 'other', clientId: null });
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', roles: ['DESIGNER'] }, { projectId: 'p1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException for missing project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', roles: ['STRATEGIST'] }, { projectId: 'none' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should pass through when no projectId', async () => {
    const result = await guard.canActivate(makeCtx({ sub: 'u1', roles: ['ADMIN'] }, {}));
    expect(result).toBe(true);
  });
});
