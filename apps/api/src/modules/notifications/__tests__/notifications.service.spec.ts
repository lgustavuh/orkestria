import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const mockPrisma = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: 'n1', type: 'SYSTEM' });
      const result = await service.create({ userId: 'u1', type: 'SYSTEM', title: 'Test', message: 'Hello' });
      expect(result.id).toBe('n1');
    });
  });

  describe('createBulk', () => {
    it('should create notifications for multiple users', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });
      await service.createBulk(['u1', 'u2', 'u3'], 'TASK_ASSIGNED', 'Nova tarefa', 'Detalhes');
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: 'u1' })]) }),
      );
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications with unread count', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      mockPrisma.notification.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const result = await service.findByUser('u1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.unreadCount).toBe(3);
      expect(result.meta.total).toBe(5);
    });

    it('should filter by isRead', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findByUser('u1', { isRead: false });
      const call = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(call.where.isRead).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markAsRead('n1', 'u1');
      expect(result.isRead).toBe(true);
    });

    it('should reject marking others notifications', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'other' });
      await expect(service.markAsRead('n1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const result = await service.markAllAsRead('u1');
      expect(result.message).toContain('lidas');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
      );
    });
  });
});
