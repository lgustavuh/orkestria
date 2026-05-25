import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;

  const mockTx = {
    project: { create: jest.fn(), update: jest.fn() },
    projectMember: { create: jest.fn(), createMany: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn((fn) => fn(mockTx)),
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    projectStage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    task: { groupBy: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create project with default stages', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        stages: [{ type: 'BACKLOG', name: 'Backlog', isActive: true }],
      };

      mockTx.project.create.mockResolvedValue(mockProject);
      mockTx.projectMember.create.mockResolvedValue({});

      const result = await service.create(
        { name: 'Test Project', channels: ['instagram'] },
        'user-1',
      );

      expect(result.name).toBe('Test Project');
      expect(mockTx.projectMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should add additional members', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'proj-1', name: 'P' });
      mockTx.projectMember.create.mockResolvedValue({});
      mockTx.projectMember.createMany.mockResolvedValue({});

      await service.create(
        { name: 'P', memberIds: ['user-2', 'user-3'] },
        'user-1',
      );

      expect(mockTx.projectMember.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-2' }),
            expect.objectContaining({ userId: 'user-3' }),
          ]),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should filter by member for non-admin/strategist', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.project.count.mockResolvedValue(0);

      await service.findAll('user-1', ['COPYWRITER'], {});

      const call = mockPrisma.project.findMany.mock.calls[0][0];
      expect(call.where.members).toBeDefined();
    });

    it('should show all projects for admin', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.project.count.mockResolvedValue(0);

      await service.findAll('user-1', ['ADMIN'], {});

      const call = mockPrisma.project.findMany.mock.calls[0][0];
      expect(call.where.members).toBeUndefined();
    });

    it('should apply search filter', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.project.count.mockResolvedValue(0);

      await service.findAll('user-1', ['ADMIN'], { search: 'black friday' });

      const call = mockPrisma.project.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', name: 'P' });

      const result = await service.findOne('proj-1', 'user-1', ['ADMIN']);
      expect(result.name).toBe('P');
    });

    it('should throw NotFoundException for missing project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('none', 'user-1', ['ADMIN']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update project for strategist/creator', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', createdById: 'user-1' });
      mockPrisma.project.update.mockResolvedValue({ id: 'proj-1', name: 'Updated' });

      const result = await service.update('proj-1', { name: 'Updated' }, 'user-1', ['STRATEGIST']);
      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException for non-authorized user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', createdById: 'other' });

      await expect(
        service.update('proj-1', { name: 'X' }, 'user-1', ['COPYWRITER']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('should only allow admin to delete', async () => {
      await expect(
        service.softDelete('proj-1', 'user-1', ['COPYWRITER']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete for admin', async () => {
      mockPrisma.project.update.mockResolvedValue({ isDeleted: true });

      const result = await service.softDelete('proj-1', 'user-1', ['ADMIN']);
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('recalculateProgress', () => {
    it('should calculate correct percentage', async () => {
      mockPrisma.task.groupBy.mockResolvedValue([
        { status: 'DONE', _count: 3 },
        { status: 'TODO', _count: 2 },
        { status: 'IN_PROGRESS', _count: 5 },
      ]);
      mockPrisma.project.update.mockResolvedValue({});

      const result = await service.recalculateProgress('proj-1');
      expect(result).toBe(30); // 3/10
    });

    it('should return 0 for project with no tasks', async () => {
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.project.update.mockResolvedValue({});

      const result = await service.recalculateProgress('proj-1');
      expect(result).toBe(0);
    });
  });
});
