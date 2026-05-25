import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalStatus, ApprovalType } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    taskId?: string;
    fileId?: string;
    type: ApprovalType;
    title: string;
    description?: string;
    requestedById: string;
  }) {
    if (!params.taskId && !params.fileId) {
      throw new BadRequestException('Aprovação precisa de uma tarefa ou arquivo vinculado');
    }

    return this.prisma.approval.create({
      data: {
        taskId: params.taskId,
        fileId: params.fileId,
        type: params.type,
        title: params.title,
        description: params.description,
        requestedById: params.requestedById,
        status: 'PENDING',
      },
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true, client: { select: { name: true } } } } } },
        file: { select: { id: true, originalName: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(userId: string, roles: string[], query: {
    projectId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }, tenantId?: string | null) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.task = { ...where.task, project: { tenantId } };

    // Clientes só veem aprovações do tipo CLIENT
    if (roles.includes('CLIENT') && !roles.includes('ADMIN')) {
      where.type = 'CLIENT';
    } else if (query.type) {
      where.type = query.type;
    }

    if (query.status) where.status = query.status;
    if (query.projectId) {
      where.task = { projectId: query.projectId };
    }

    // Membros que não são admin/estrategista veem apenas aprovações de projetos onde participam
    if (!roles.includes('ADMIN') && !roles.includes('STRATEGIST') && !roles.includes('CLIENT')) {
      where.OR = [
        { requestedById: userId },
        { task: { project: { members: { some: { userId } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: { id: true, title: true, projectId: true, project: { select: { name: true, client: { select: { name: true } } } } } },
          file: { select: { id: true, originalName: true, mimeType: true } },
          requestedBy: { select: { id: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.approval.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async resolve(
    approvalId: string,
    userId: string,
    roles: string[],
    status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    feedback?: string,
  ) {
    const approval = await this.prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) throw new NotFoundException('Aprovação não encontrada');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Esta aprovação já foi resolvida');
    }

    // Verificar permissão: internos só por admin/estrategista; client por perfil CLIENT
    if (approval.type === 'INTERNAL') {
      if (!roles.includes('ADMIN') && !roles.includes('STRATEGIST')) {
        throw new ForbiddenException('Apenas admin ou estrategista podem aprovar internamente');
      }
    }
    // CLIENT type é tratado pelo ClientPortalController

    // Audit: approval resolved
    await this.prisma.auditLog.create({
      data: { userId, action: 'APPROVE' as any, resource: 'approval', resourceId: approvalId, details: { status, feedback } },
    }).catch(() => {});

    // Notify task assignee and requestor about the resolution
    try {
      const resolver = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } });
      const resolverName = resolver?.firstName || 'Alguém';
      const statusLabel = status === 'APPROVED' ? 'aprovada' : status === 'REJECTED' ? 'reprovada' : 'precisa de ajustes';
      const notifyIds = new Set<string>();
      if (approval.requestedById && approval.requestedById !== userId) notifyIds.add(approval.requestedById);
      const task = approval.taskId ? await this.prisma.task.findUnique({ where: { id: approval.taskId }, select: { assigneeId: true, title: true, projectId: true } }) : null;
      if (task?.assigneeId && task.assigneeId !== userId) notifyIds.add(task.assigneeId);
      if (notifyIds.size > 0) {
        await this.prisma.notification.createMany({
          data: [...notifyIds].map(uid => ({
            userId: uid,
            type: 'APPROVAL_RESOLVED' as any,
            title: `Aprovação ${statusLabel}`,
            message: `${resolverName} ${statusLabel === 'precisa de ajustes' ? 'solicitou ajustes em' : statusLabel} "${task?.title || 'tarefa'}"${feedback ? ': ' + feedback.slice(0, 80) : ''}`,
            data: { taskId: approval.taskId, projectId: task?.projectId, approvalId },
          })),
        });
      }
    } catch {}

    return this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status,
        feedback,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: {
        task: { select: { id: true, title: true } },
        file: { select: { id: true, originalName: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
