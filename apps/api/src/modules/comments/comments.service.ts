import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommentVisibility } from '@prisma/client';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private prisma: PrismaService) {}

  async create(params: {
    taskId: string;
    userId: string;
    content: string;
    visibility?: CommentVisibility;
    parentId?: string;
    mentionedUserIds?: string[];
  }) {
    const task = await this.prisma.task.findUnique({
      where: { id: params.taskId, isDeleted: false },
      select: { id: true, title: true, projectId: true, assigneeId: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId: params.taskId,
        userId: params.userId,
        content: params.content,
        visibility: params.visibility || 'INTERNAL',
        parentId: params.parentId,
        mentions: params.mentionedUserIds?.length
          ? { create: params.mentionedUserIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        mentions: { select: { userId: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    // Notify assignee if comment is from someone else
    if (task.assigneeId && task.assigneeId !== params.userId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'COMMENT_ADDED',
            title: 'Novo comentário na sua tarefa',
            message: `${comment.user.firstName} ${comment.user.lastName} comentou em "${task.title}"`,
            data: { taskId: task.id, commentId: comment.id, projectId: task.projectId },
          },
        });
      } catch (err) {
        this.logger.error('Failed to create notification:', err);
      }
    }

    // Notify mentioned users
    if (params.mentionedUserIds?.length) {
      try {
        await this.prisma.notification.createMany({
          data: params.mentionedUserIds
            .filter(uid => uid !== params.userId)
            .map(uid => ({
              userId: uid,
              type: 'COMMENT_MENTION',
              title: 'Você foi mencionado',
              message: `${comment.user.firstName} ${comment.user.lastName} mencionou você em "${task.title}"`,
              data: { taskId: task.id, commentId: comment.id, projectId: task.projectId },
            })),
          skipDuplicates: true,
        });
      } catch (err) {
        this.logger.error('Failed to create mention notifications:', err);
      }
    }

    return comment;
  }

  async findByTask(taskId: string, userId: string, roles: string[]) {
    const isClient = roles.includes('CLIENT') && !roles.includes('ADMIN');

    return this.prisma.taskComment.findMany({
      where: {
        taskId,
        parentId: null,
        ...(isClient ? { visibility: 'CLIENT_VISIBLE' } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        mentions: { select: { userId: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          ...(isClient ? { where: { visibility: 'CLIENT_VISIBLE' } } : {}),
        },
      },
    });
  }

  async update(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.userId !== userId) throw new ForbiddenException('Você só pode editar seus próprios comentários');

    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content, isEdited: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
  }

  async delete(commentId: string, userId: string, roles: string[]) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.userId !== userId && !roles.includes('ADMIN')) throw new ForbiddenException('Sem permissão');

    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: '[comentário removido]', isEdited: true },
    });
  }
}
