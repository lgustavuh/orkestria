import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }) {
    return this.prisma.notification.create({ data: params });
  }

  async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, message, data })),
    });
  }

  async findByUser(userId: string, query: {
    isRead?: string | boolean;
    type?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 30, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.type) where.type = query.type;
    if (query.isRead === 'true' || query.isRead === true) where.isRead = true;
    else if (query.isRead === 'false' || query.isRead === false) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      unreadCount,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Todas as notificações marcadas como lidas' };
  }
}
