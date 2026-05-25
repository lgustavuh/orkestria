import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../reports.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const mockPrisma = {
    project: { findUnique: jest.fn(), count: jest.fn() },
    task: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    user: { findMany: jest.fn() },
    timeEntry: { aggregate: jest.fn(), groupBy: jest.fn() },
    approval: { count: jest.fn() },
    auditLog: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getProjectSummary', () => {
    it('should aggregate project stats', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', name: 'Test', _count: { tasks: 10, files: 5 } });
      mockPrisma.task.groupBy.mockResolvedValueOnce([
        { status: 'DONE', _count: 6 },
        { status: 'TODO', _count: 4 },
      ]).mockResolvedValueOnce([
        { assigneeId: 'u1', _count: 7 },
        { assigneeId: 'u2', _count: 3 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'Ana', lastName: 'Costa' },
        { id: 'u2', firstName: 'Bruno', lastName: 'Lima' },
      ]);
      mockPrisma.timeEntry.aggregate.mockResolvedValue({ _sum: { minutes: 960 } });
      mockPrisma.task.count.mockResolvedValue(2);

      const result = await service.getProjectSummary('p1');

      expect(result.taskStats).toEqual({ DONE: 6, TODO: 4 });
      expect(result.tasksByAssignee).toHaveLength(2);
      expect(result.totalTimeMinutes).toBe(960);
      expect(result.overdueTasks).toBe(2);
    });
  });

  describe('generateCsv', () => {
    it('should produce valid CSV', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        {
          title: 'Task with, comma', status: 'DONE', priority: 'HIGH',
          project: { name: 'Project "A"' },
          assignee: { firstName: 'Ana', lastName: 'Costa' },
          stage: { name: 'Produção' },
          dueDate: new Date('2025-10-15'),
          createdAt: new Date('2025-09-01'),
          _count: { comments: 3, files: 1 },
        },
      ]);

      const csv = await service.generateCsv({});
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Projeto,Tarefa,Status'); // Header
      expect(lines[1]).toContain('"Task with, comma"'); // Escaped comma
      expect(lines[1]).toContain('Project'); // Actually tests escaping in the join
      expect(lines).toHaveLength(2); // Header + 1 row
    });

    it('should apply filters', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      await service.generateCsv({ projectId: 'p1', status: 'DONE' });
      const call = mockPrisma.task.findMany.mock.calls[0][0];
      expect(call.where.projectId).toBe('p1');
      expect(call.where.status).toBe('DONE');
    });
  });

  describe('getProductivityReport', () => {
    it('should aggregate time and tasks per user', async () => {
      mockPrisma.timeEntry.groupBy.mockResolvedValue([
        { userId: 'u1', _sum: { minutes: 480 }, _count: 8 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'Ana', lastName: 'Costa', roles: [{ role: { name: 'STRATEGIST' } }] },
      ]);
      mockPrisma.task.groupBy.mockResolvedValue([
        { assigneeId: 'u1', _count: 5 },
      ]);

      const result = await service.getProductivityReport({});

      expect(result).toHaveLength(1);
      expect(result[0].totalHours).toBe(8);
      expect(result[0].tasksCompleted).toBe(5);
    });
  });

  describe('getDashboardStats', () => {
    it('should return stats for admin', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10).mockResolvedValueOnce(6);
      mockPrisma.task.count.mockResolvedValueOnce(50).mockResolvedValueOnce(8).mockResolvedValueOnce(2);
      mockPrisma.approval.count.mockResolvedValue(3);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats('admin', ['ADMIN']);

      expect(result.totalProjects).toBe(10);
      expect(result.activeProjects).toBe(6);
      expect(result.totalTasks).toBe(50);
      expect(result.myPendingTasks).toBe(8);
      expect(result.overdueTasks).toBe(2);
      expect(result.pendingApprovals).toBe(3);
    });
  });
});
