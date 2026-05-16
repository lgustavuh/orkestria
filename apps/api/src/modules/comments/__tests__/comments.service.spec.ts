import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsService } from '../comments.service';
import { PrismaService } from '../../../database/prisma.service';

describe('CommentsService', () => {
  let service: CommentsService;
  const mockPrisma = {
    task: { findUnique: jest.fn() },
    taskComment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should reject comment on non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ taskId: 'none', userId: 'u1', content: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create comment with visibility', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', projectId: 'p1' });
      mockPrisma.taskComment.create.mockResolvedValue({ id: 'c1', visibility: 'CLIENT_VISIBLE' });
      const result = await service.create({ taskId: 't1', userId: 'u1', content: 'Test', visibility: 'CLIENT_VISIBLE' });
      expect(result.visibility).toBe('CLIENT_VISIBLE');
    });
  });

  describe('findByTask', () => {
    it('should filter by visibility for client users', async () => {
      mockPrisma.taskComment.findMany.mockResolvedValue([]);
      await service.findByTask('t1', 'u1', ['CLIENT']);
      const call = mockPrisma.taskComment.findMany.mock.calls[0][0];
      expect(call.where.visibility).toBe('CLIENT_VISIBLE');
    });

    it('should show all comments for internal users', async () => {
      mockPrisma.taskComment.findMany.mockResolvedValue([]);
      await service.findByTask('t1', 'u1', ['STRATEGIST']);
      const call = mockPrisma.taskComment.findMany.mock.calls[0][0];
      expect(call.where.visibility).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should only allow own comment editing', async () => {
      mockPrisma.taskComment.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });
      await expect(service.update('c1', 'u1', 'edited')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should allow admin to delete any comment', async () => {
      mockPrisma.taskComment.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });
      mockPrisma.taskComment.update.mockResolvedValue({ content: '[comentário removido]' });
      const result = await service.delete('c1', 'admin', ['ADMIN']);
      expect(result.content).toBe('[comentário removido]');
    });
  });
});
