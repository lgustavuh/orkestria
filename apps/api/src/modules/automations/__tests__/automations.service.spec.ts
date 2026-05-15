import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AutomationsService } from '../automations.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AutomationsService', () => {
  let service: AutomationsService;
  const mockPrisma = {
    automation: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    automationAction: { deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AutomationsService>(AutomationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create automation with actions', async () => {
      mockPrisma.automation.create.mockResolvedValue({
        id: 'auto-1', name: 'Test', trigger: 'TASK_COMPLETED',
        actions: [{ type: 'SEND_NOTIFICATION', order: 0 }],
      });

      const result = await service.create({
        name: 'Test', trigger: 'TASK_COMPLETED',
        actions: [{ type: 'SEND_NOTIFICATION', config: { title: 'Done' }, order: 0 }],
      });

      expect(result.name).toBe('Test');
      expect(result.actions).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should filter by project and trigger', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([]);
      await service.findAll({ projectId: 'p1', trigger: 'TASK_OVERDUE' });
      const call = mockPrisma.automation.findMany.mock.calls[0][0];
      expect(call.where.projectId).toBe('p1');
      expect(call.where.trigger).toBe('TASK_OVERDUE');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException', async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should replace actions when provided', async () => {
      mockPrisma.automationAction.deleteMany.mockResolvedValue({});
      mockPrisma.automation.update.mockResolvedValue({ id: 'auto-1', actions: [] });

      await service.update('auto-1', {
        name: 'Updated',
        actions: [{ type: 'ADVANCE_STAGE', config: {}, order: 0 }],
      });

      expect(mockPrisma.automationAction.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { automationId: 'auto-1' } }),
      );
    });

    it('should toggle isActive without replacing actions', async () => {
      mockPrisma.automation.update.mockResolvedValue({ id: 'auto-1', isActive: false });

      await service.update('auto-1', { isActive: false });

      expect(mockPrisma.automationAction.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findByTrigger', () => {
    it('should include global and project-specific automations', async () => {
      mockPrisma.automation.findMany.mockResolvedValue([]);
      await service.findByTrigger('TASK_COMPLETED', 'p1');
      const call = mockPrisma.automation.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toContainEqual({ projectId: 'p1' });
      expect(call.where.OR).toContainEqual({ projectId: null });
    });
  });
});
