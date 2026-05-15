import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../files/s3.service';

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(private prisma: PrismaService, private s3: S3Service) {}

  /**
   * Retorna os IDs de clients vinculados ao usuário.
   * Usado internamente para filtrar projetos.
   */
  private async getClientIdsForUser(userId: string): Promise<string[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { userId },
      select: { clientId: true },
    });
    return clientUsers.map((cu) => cu.clientId);
  }

  async getProjects(userId: string, query: { page?: number; limit?: number }) {
    const clientIds = await this.getClientIdsForUser(userId);
    if (!clientIds.length) return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      clientId: { in: clientIds },
      isDeleted: false,
      status: { not: 'DRAFT' as const }, // Cliente não vê rascunhos
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          progress: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
          stages: {
            where: { type: { not: 'BACKLOG' } },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, type: true, isActive: true, completedAt: true },
          },
          members: {
            select: {
              roleInProject: true,
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
          _count: { select: { tasks: true, files: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getProjectDetail(projectId: string, userId: string) {
    const clientIds = await this.getClientIdsForUser(userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId, isDeleted: false },
      select: {
        id: true,
        name: true,
        description: true,
        objective: true,
        channels: true,
        status: true,
        priority: true,
        progress: true,
        startDate: true,
        endDate: true,
        completedAt: true,
        updatedAt: true,
        clientId: true,
        // Membros: só nomes e papéis, sem email/dados internos
        members: {
          select: {
            roleInProject: true,
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        stages: {
          where: { type: { not: 'BACKLOG' } },
          orderBy: { order: 'asc' },
          select: { id: true, name: true, type: true, isActive: true, startedAt: true, completedAt: true },
        },
      },
    });

    if (!project || !project.clientId || !clientIds.includes(project.clientId)) {
      throw new NotFoundException('Projeto não encontrado');
    }

    return project;
  }

  async getDeliverables(projectId: string, userId: string) {
    await this.ensureClientAccess(projectId, userId);

    return this.prisma.file.findMany({
      where: {
        projectId,
        visibility: 'CLIENT_SHARED',
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        description: true,
        version: true,
        createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async getApprovals(userId: string, query: { projectId?: string; status?: string }) {
    const clientIds = await this.getClientIdsForUser(userId);

    const where: any = {
      type: 'CLIENT',
      task: {
        project: { clientId: { in: clientIds }, isDeleted: false },
      },
    };

    if (query.projectId) {
      where.task = { ...where.task, projectId: query.projectId };
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true, title: true, description: true, status: true, projectId: true,
            project: { select: { id: true, name: true } },
            files: {
              where: { isDeleted: false },
              select: { id: true, fileName: true, originalName: true, mimeType: true, sizeBytes: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
            comments: {
              select: { id: true, content: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async resolveApproval(
    approvalId: string,
    userId: string,
    status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    feedback?: string,
  ) {
    const approval = await this.prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        task: {
          select: {
            id: true, title: true, description: true, status: true,
            project: { select: { id: true, name: true, clientId: true } },
            files: { where: { isDeleted: false }, select: { id: true, fileName: true, originalName: true, mimeType: true, sizeBytes: true }, orderBy: { createdAt: 'desc' }, take: 10 },
            comments: { select: { id: true, content: true, createdAt: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!approval || approval.type !== 'CLIENT') {
      throw new NotFoundException('Aprovação não encontrada');
    }

    const clientIds = await this.getClientIdsForUser(userId);
    if (!approval.task?.project?.clientId || !clientIds.includes(approval.task.project.clientId)) {
      throw new ForbiddenException('Sem acesso a esta aprovação');
    }

    const updated = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status,
        feedback,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    // Change task status back to IN_PROGRESS after client resolves
    if (updated.taskId) {
      try {
        await this.prisma.task.update({
          where: { id: updated.taskId },
          data: { status: 'IN_PROGRESS' },
        });
        // Add approval result as comment on the task
        const statusLabel = status === 'APPROVED' ? '✅ Aprovado pelo cliente' 
          : status === 'REJECTED' ? '❌ Reprovado pelo cliente'
          : '🔄 Cliente solicitou ajustes';
        const commentContent = feedback 
          ? `${statusLabel}\n\n"${feedback}"`
          : statusLabel;
        
        try {
          await this.prisma.taskComment.create({
            data: {
              taskId: updated.taskId,
              userId,
              content: commentContent,
              visibility: 'CLIENT_VISIBLE',
            },
          });
        } catch (err) {
          this.logger.error('Failed to create approval comment:', err);
        }

        // Notify ALL team members of the project
        const task = await this.prisma.task.findUnique({ where: { id: updated.taskId }, select: { assigneeId: true, title: true, projectId: true } });
        if (task?.projectId) {
          const members = await this.prisma.projectMember.findMany({ where: { projectId: task.projectId }, select: { userId: true } });
          const clientUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
          const clientName = `${clientUser?.firstName || ''} ${clientUser?.lastName || ''}`.trim();
          const notifTitle = status === 'APPROVED' ? `✅ ${clientName} aprovou` : status === 'REJECTED' ? `❌ ${clientName} reprovou` : `🔄 ${clientName} pediu ajustes`;

          await this.prisma.notification.createMany({
            data: members.map(m => ({
              userId: m.userId,
              type: 'APPROVAL_RESOLVED' as any,
              title: notifTitle,
              message: `"${task.title}"${feedback ? ` — "${feedback}"` : ''}`,
              data: { taskId: updated.taskId, projectId: task.projectId },
            })),
            skipDuplicates: true,
          });
        }
      } catch (err) {
        this.logger.error('Failed to update task status after approval:', err);
      }
    }

    return updated;
  }

  async submitFeedback(projectId: string, userId: string, content: string) {
    await this.ensureClientAccess(projectId, userId);

    const clientUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    const clientName = `${clientUser?.firstName || ''} ${clientUser?.lastName || ''}`.trim();

    // Notify ALL team members of the project
    try {
      const members = await this.prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      });

      if (members.length > 0) {
        await this.prisma.notification.createMany({
          data: members.map(m => ({
            userId: m.userId,
            type: 'FEEDBACK_RECEIVED' as any,
            title: 'Feedback do cliente',
            message: `${clientName}: ${content.substring(0, 150)}`,
            data: { projectId, fullMessage: content, fromUserId: userId },
          })),
          skipDuplicates: true,
        });
      }
    } catch (err) {
      this.logger.error('Failed to notify team about feedback:', err);
    }

    return { message: 'Feedback enviado com sucesso' };
  }

  async getNotifications(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getProjectTimeline(projectId: string, userId: string) {
    await this.ensureClientAccess(projectId, userId);

    // Retorna histórico resumido: mudanças de etapa e entregas
    const [stages, recentFiles, approvals] = await Promise.all([
      this.prisma.projectStage.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
        select: { name: true, type: true, isActive: true, startedAt: true, completedAt: true },
      }),
      this.prisma.file.findMany({
        where: { projectId, visibility: 'CLIENT_SHARED', isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, originalName: true, createdAt: true },
      }),
      this.prisma.approval.findMany({
        where: { type: 'CLIENT', task: { projectId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, createdAt: true, resolvedAt: true },
      }),
    ]);

    return { stages, recentDeliverables: recentFiles, approvals };
  }

  // ── Helper ──

  private async ensureClientAccess(projectId: string, userId: string) {
    const clientIds = await this.getClientIdsForUser(userId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, isDeleted: false },
      select: { clientId: true },
    });

    if (!project || !project.clientId || !clientIds.includes(project.clientId)) {
      throw new ForbiddenException('Sem acesso a este projeto');
    }
  }

  async getClientProfile(userId: string) {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: { userId, isPrimary: true },
      include: {
        client: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
      },
    });
    if (!clientUser) throw new NotFoundException('Perfil não encontrado');
    return { user: clientUser.user, client: clientUser.client };
  }

  async updateClientProfile(userId: string, data: {
    firstName?: string; lastName?: string; phone?: string; avatarUrl?: string;
    name?: string; companyName?: string; email?: string; document?: string;
    documentType?: string; address?: string; city?: string; state?: string;
    zipCode?: string; website?: string; logoUrl?: string;
  }) {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: { userId, isPrimary: true },
    });
    if (!clientUser) throw new NotFoundException('Perfil não encontrado');

    // Update user data
    const userData: any = {};
    if (data.firstName) userData.firstName = data.firstName;
    if (data.lastName) userData.lastName = data.lastName;
    if (data.phone) userData.phone = data.phone;
    if (data.avatarUrl !== undefined) userData.avatarUrl = data.avatarUrl;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userData });
    }

    // Update client data
    const clientData: any = {};
    if (data.name) clientData.name = data.name;
    if (data.companyName !== undefined) clientData.companyName = data.companyName;
    if (data.email) clientData.email = data.email;
    if (data.document) clientData.document = data.document;
    if (data.documentType) clientData.documentType = data.documentType;
    if (data.address !== undefined) clientData.address = data.address;
    if (data.city !== undefined) clientData.city = data.city;
    if (data.state !== undefined) clientData.state = data.state;
    if (data.zipCode !== undefined) clientData.zipCode = data.zipCode;
    if (data.website !== undefined) clientData.website = data.website;
    if (data.logoUrl !== undefined) clientData.logoUrl = data.logoUrl;

    if (Object.keys(clientData).length > 0) {
      await this.prisma.client.update({ where: { id: clientUser.clientId }, data: clientData });
    }

    return this.getClientProfile(userId);
  }

  async changeClientPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Senha atual incorreta');

    // Password strength validation
    if (newPassword.length < 8) throw new BadRequestException('Senha deve ter no mínimo 8 caracteres');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(newPassword)) {
      throw new BadRequestException('Senha deve conter: maiúscula, minúscula, número e caractere especial');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha alterada com sucesso' };
  }

  async getFileDownloadUrl(fileId: string, userId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { s3Key: true, originalName: true, projectId: true, project: { select: { clientId: true } } },
    });
    if (!file) throw new NotFoundException('Arquivo não encontrado');

    // Verify the client has access to this file's project
    if (userId && file.project?.clientId) {
      const clientIds = await this.getClientIdsForUser(userId);
      if (!clientIds.includes(file.project.clientId)) {
        throw new ForbiddenException('Sem acesso a este arquivo');
      }
    }

    const downloadUrl = await this.s3.getPresignedDownloadUrl(file.s3Key, file.originalName);
    return { downloadUrl };
  }
}
