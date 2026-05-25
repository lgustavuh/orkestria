import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { ProjectsService } from '../../projects/projects.service';
import { PrismaService } from '../../../database/prisma.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;
  let projectsService: any;

  const mockPrisma = {
  user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Test', lastName: 'User' }) },
  projectMember: { findMany: jest.fn().mockResolvedValue([]) },
  notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    taskChecklist: { create: jest.fn() },
    checklistItem: { findUnique: jest.fn(), update: jest.fn() },
    timeEntry: { create: jest.fn() },
    taskDependency: { findUnique: jest.fn(), create: jest.fn() },
  };

  const mockProjectsService = {
    recalculateProgress: jest.fn().mockResolvedValue(50),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task with basic fields', async () => {
      const mockTask = { id: 'task-1', title: 'Test Task', projectId: 'proj-1' };
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create('proj-1', { title: 'Test Task' }, 'user-1');

      expect(result.title).toBe('Test Task');
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: 'proj-1', createdById: 'user-1' }),
        }),
      );
      expect(mockProjectsService.recalculateProgress).toHaveBeenCalledWith('proj-1');
    });

    it('should create checklist when provided', async () => {
      mockPrisma.task.create.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      mockPrisma.taskChecklist.create.mockResolvedValue({});

      await service.create('proj-1', {
        title: 'Task',
        checklist: ['Item 1', 'Item 2', 'Item 3'],
      }, 'user-1');

      expect(mockPrisma.taskChecklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'task-1',
            items: { create: expect.arrayContaining([
              expect.objectContaining({ text: 'Item 1', order: 0 }),
              expect.objectContaining({ text: 'Item 2', order: 1 }),
            ]) },
          }),
        }),
      );
    });

    it('should reject subtask from different project', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ projectId: 'other-proj' });

      await expect(
        service.create('proj-1', { title: 'Sub', parentTaskId: 'parent-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return task with all relations', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        title: 'Test',
        comments: [],
        subtasks: [],
        checklists: [],
      });

      const result = await service.findOne('task-1');
      expect(result.id).toBe('task-1');
    });

    it('should throw NotFoundException for missing task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockTask = { id: 'task-1', projectId: 'proj-1', assigneeId: 'user-1', createdById: 'user-1', status: 'TODO' };

    it('should allow assignee to update own task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const result = await service.update('task-1', { title: 'Updated' }, 'user-1', ['COPYWRITER']);
      expect(result.title).toBe('Updated');
    });

    it('should allow admin to update any task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'other', createdById: 'other' });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Admin Edit' });

      const result = await service.update('task-1', { title: 'Admin Edit' }, 'admin-1', ['ADMIN']);
      expect(result.title).toBe('Admin Edit');
    });

    it('should reject update from non-authorized user', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'other', createdById: 'other' });

      await expect(
        service.update('task-1', { title: 'X' }, 'random-user', ['DESIGNER']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set completedAt when status changes to DONE', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'DONE', completedAt: new Date() });

      await service.update('task-1', { status: 'DONE' }, 'user-1', ['ADMIN']);

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: expect.any(Date) }),
        }),
      );
    });

    it('should clear completedAt when status changes from DONE', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ ...mockTask, status: 'DONE' });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });

      await service.update('task-1', { status: 'IN_PROGRESS' }, 'user-1', ['ADMIN']);

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: null }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should only allow admin/strategist to delete', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });

      await expect(
        service.softDelete('task-1', 'user-1', ['COPYWRITER']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete and recalculate progress', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', projectId: 'proj-1' });
      mockPrisma.task.update.mockResolvedValue({});

      await service.softDelete('task-1', 'user-1', ['ADMIN']);

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } }),
      );
      expect(mockProjectsService.recalculateProgress).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('toggleChecklistItem', () => {
    it('should toggle completion', async () => {
      mockPrisma.checklistItem.findUnique.mockResolvedValue({ id: 'item-1', isCompleted: false });
      mockPrisma.checklistItem.update.mockResolvedValue({ isCompleted: true });

      const result = await service.toggleChecklistItem('item-1');
      expect(mockPrisma.checklistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCompleted: true, completedAt: expect.any(Date) }),
        }),
      );
    });

    it('should uncheck completed item', async () => {
      mockPrisma.checklistItem.findUnique.mockResolvedValue({ id: 'item-1', isCompleted: true });
      mockPrisma.checklistItem.update.mockResolvedValue({ isCompleted: false });

      await service.toggleChecklistItem('item-1');
      expect(mockPrisma.checklistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCompleted: false, completedAt: null }),
        }),
      );
    });
  });

  describe('addDependency', () => {
    it('should prevent circular dependency', async () => {
      mockPrisma.taskDependency.findUnique.mockResolvedValue({ id: 'dep-1' });

      await expect(
        service.addDependency('task-a', 'task-b'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create dependency when no circular ref', async () => {
      mockPrisma.taskDependency.findUnique.mockResolvedValue(null);
      mockPrisma.taskDependency.create.mockResolvedValue({ taskId: 'task-a', dependsOnTaskId: 'task-b' });

      const result = await service.addDependency('task-a', 'task-b');
      expect(result.taskId).toBe('task-a');
    });
  });
});
