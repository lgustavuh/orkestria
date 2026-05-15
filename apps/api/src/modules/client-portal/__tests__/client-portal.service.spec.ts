import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClientPortalService } from '../client-portal.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let prisma: any;

  const mockPrisma = {
    clientUser: { findMany: jest.fn() },
    project: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    file: { findMany: jest.fn() },
    approval: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    projectStage: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should return empty when user has no client associations', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([]);

      const result = await service.getProjects('user-1', {});
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return projects for client user', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'Test' }]);
      mockPrisma.project.count.mockResolvedValue(1);

      const result = await service.getProjects('user-1', {});
      expect(result.data).toHaveLength(1);

      // Should exclude DRAFT projects
      const call = mockPrisma.project.findMany.mock.calls[0][0];
      expect(call.where.status).toEqual({ not: 'DRAFT' });
    });
  });

  describe('getProjectDetail', () => {
    it('should deny access for non-client projects', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', clientId: 'client-2' });

      await expect(
        service.getProjectDetail('proj-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return project detail for authorized client', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test',
        clientId: 'client-1',
        stages: [],
        members: [],
      });

      const result = await service.getProjectDetail('proj-1', 'user-1');
      expect(result.name).toBe('Test');
    });
  });

  describe('getDeliverables', () => {
    it('should only return CLIENT_SHARED files', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.project.findUnique.mockResolvedValue({ clientId: 'client-1' });
      mockPrisma.file.findMany.mockResolvedValue([{ id: 'f1', visibility: 'CLIENT_SHARED' }]);

      const result = await service.getDeliverables('proj-1', 'user-1');

      const call = mockPrisma.file.findMany.mock.calls[0][0];
      expect(call.where.visibility).toBe('CLIENT_SHARED');
    });
  });

  describe('resolveApproval', () => {
    it('should allow client to approve CLIENT type approval', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: 'a1',
        type: 'CLIENT',
        task: { project: { clientId: 'client-1' } },
      });
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.approval.update.mockResolvedValue({ status: 'APPROVED' });

      const result = await service.resolveApproval('a1', 'user-1', 'APPROVED');
      expect(result.status).toBe('APPROVED');
    });

    it('should reject non-CLIENT type approvals', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({ id: 'a1', type: 'INTERNAL' });

      await expect(
        service.resolveApproval('a1', 'user-1', 'APPROVED'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny access to unrelated client', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: 'a1',
        type: 'CLIENT',
        task: { project: { clientId: 'client-2' } },
      });
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);

      await expect(
        service.resolveApproval('a1', 'user-1', 'APPROVED'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitFeedback', () => {
    it('should create notification for feedback', async () => {
      mockPrisma.clientUser.findMany.mockResolvedValue([{ clientId: 'client-1' }]);
      mockPrisma.project.findUnique.mockResolvedValue({ clientId: 'client-1' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });

      const result = await service.submitFeedback('proj-1', 'user-1', 'Great work!');
      expect(result.message).toContain('sucesso');
    });
  });
});
