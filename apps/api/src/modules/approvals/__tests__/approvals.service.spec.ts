import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApprovalsService } from '../approvals.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let prisma: any;

  const mockPrisma = {
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Test' }) },
  task: { findUnique: jest.fn().mockResolvedValue({ assigneeId: 'u2', title: 'Task', projectId: 'p1' }) },
  notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    approval: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ApprovalsService>(ApprovalsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should require taskId or fileId', async () => {
      await expect(
        service.create({ type: 'INTERNAL', title: 'Test', requestedById: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create approval with task', async () => {
      mockPrisma.approval.create.mockResolvedValue({ id: 'a1', status: 'PENDING' });
      const result = await service.create({ taskId: 't1', type: 'INTERNAL', title: 'Review', requestedById: 'u1' });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('resolve', () => {
    it('should reject already resolved approval', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({ id: 'a1', status: 'APPROVED' });
      await expect(
        service.resolve('a1', 'u1', ['ADMIN'], 'APPROVED'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-admin/strategist for internal approvals', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({ id: 'a1', status: 'PENDING', type: 'INTERNAL' });
      await expect(
        service.resolve('a1', 'u1', ['COPYWRITER'], 'APPROVED'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should approve for admin', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({ id: 'a1', status: 'PENDING', type: 'INTERNAL' });
      mockPrisma.approval.update.mockResolvedValue({ id: 'a1', status: 'APPROVED', resolvedById: 'u1' });
      const result = await service.resolve('a1', 'u1', ['ADMIN'], 'APPROVED', 'Looks good');
      expect(result.status).toBe('APPROVED');
    });
  });
});
