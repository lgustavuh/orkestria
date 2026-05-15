import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private projectsService: ProjectsService,
  ) {}

  private async notifyStrategists(projectId: string, excludeUserId: string, title: string, message: string, taskId: string) {
    try {
      const members = await this.prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { include: { roles: { include: { role: true } } } } },
      });
      const strategists = members.filter(m =>
        m.userId !== excludeUserId &&
        m.user.roles.some(r => ['ADMIN', 'STRATEGIST'].includes(r.role.name))
      );
      if (strategists.length > 0) {
        await this.prisma.notification.createMany({
          data: strategists.map(s => ({
            userId: s.userId,
            type: 'TASK_UPDATED' as any,
            title,
            message,
            data: { taskId, projectId },
          })),
          skipDuplicates: true,
        });
      }
    } catch (err) {
      this.logger.error('Failed to notify strategists:', err);
    }
  }

  async create(projectId: string, dto: CreateTaskDto, userId: string) {
    // Validar subtarefa pertence ao mesmo projeto
    if (dto.parentTaskId) {
      const parent = await this.prisma.task.findUnique({
        where: { id: dto.parentTaskId },
        select: { projectId: true },
      });
      if (!parent || parent.projectId !== projectId) {
        throw new BadRequestException('Tarefa pai não pertence a este projeto');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        assigneeId: dto.assigneeId,
        createdById: userId,
        stageId: dto.stageId,
        parentTaskId: dto.parentTaskId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Criar checklist se fornecido
    if (dto.checklist?.length) {
      await this.prisma.taskChecklist.create({
        data: {
          taskId: task.id,
          title: 'Checklist',
          items: {
            create: dto.checklist.map((text, index) => ({
              text,
              order: index,
            })),
          },
        },
      });
    }

    // Recalcular progresso do projeto
    await this.projectsService.recalculateProgress(projectId);

    // Notify strategists
    const creator = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    this.notifyStrategists(projectId, userId, 'Nova tarefa criada', `${creator?.firstName || ''} criou "${task.title}"`, task.id);

    return task;
  }

  async findByProject(projectId: string, query: {
    status?: string;
    assigneeId?: string;
    stageId?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      projectId,
      isDeleted: false,
      parentTaskId: null, // Apenas tarefas raiz
    };

    if (query.status) where.status = query.status as any;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.stageId) where.stageId = query.stageId;
    if (query.priority) where.priority = query.priority as any;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          stage: { select: { id: true, name: true, type: true } },
          subtasks: {
            where: { isDeleted: false },
            select: { id: true, title: true, status: true },
            orderBy: { order: 'asc' },
          },
          _count: { select: { comments: true, files: true, subtasks: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, isDeleted: false },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, clientId: true, client: { select: { name: true } } } },
        stage: true,
        parentTask: { select: { id: true, title: true } },
        subtasks: {
          where: { isDeleted: false },
          orderBy: { order: 'asc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        checklists: {
          include: { items: { orderBy: { order: 'asc' } } },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            replies: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        files: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { id: true, firstName: true, lastName: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        dependenciesFrom: {
          include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
        },
        dependenciesTo: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 20,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, roles: string[]) {
    const task = await this.prisma.task.findUnique({
      where: { id, isDeleted: false },
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada');

    // Membros só editam tarefas próprias; admin/estrategista edita qualquer
    const canEdit =
      roles.includes('ADMIN') ||
      roles.includes('STRATEGIST') ||
      task.assigneeId === userId ||
      task.createdById === userId;

    if (!canEdit) {
      throw new ForbiddenException('Sem permissão para editar esta tarefa');
    }

    const previousStatus = task.status;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.stageId !== undefined && { stageId: dto.stageId }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
        ...(dto.order !== undefined && { order: dto.order }),
        // Marcar completedAt se status mudou para DONE
        ...(dto.status === 'DONE' && previousStatus !== 'DONE' && { completedAt: new Date() }),
        ...(dto.status && dto.status !== 'DONE' && { completedAt: null }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, type: true } },
      },
    });

    // Recalcular progresso do projeto
    await this.projectsService.recalculateProgress(task.projectId);

    // Notifications
    try {
      const updater = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } });
      const updaterName = updater?.firstName || 'Alguém';

      // Notify on status change
      if (dto.status && dto.status !== previousStatus) {
        this.notifyStrategists(task.projectId, userId,
          'Status alterado',
          `${updaterName} alterou "${task.title}" para ${dto.status}`,
          task.id,
        );
        // Notify assignee if different from updater
        if (task.assigneeId && task.assigneeId !== userId) {
          await this.prisma.notification.create({
            data: { userId: task.assigneeId, type: 'TASK_UPDATED' as any, title: 'Tarefa atualizada', message: `${updaterName} alterou o status de "${task.title}" para ${dto.status}`, data: { taskId: task.id, projectId: task.projectId } },
          }).catch(() => {});
        }
      }

      // Notify on assignment change
      if (dto.assigneeId && dto.assigneeId !== task.assigneeId && dto.assigneeId !== userId) {
        await this.prisma.notification.create({
          data: { userId: dto.assigneeId, type: 'TASK_ASSIGNED' as any, title: 'Tarefa atribuída', message: `${updaterName} atribuiu "${task.title}" para você`, data: { taskId: task.id, projectId: task.projectId } },
        }).catch(() => {});
      }
    } catch {}

    return updated;
  }

  async softDelete(id: string, userId: string, roles: string[]) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    if (!roles.includes('ADMIN') && !roles.includes('STRATEGIST')) {
      throw new ForbiddenException('Sem permissão para excluir tarefas');
    }

    await this.prisma.task.update({
      where: { id },
      data: { isDeleted: true },
    });

    await this.projectsService.recalculateProgress(task.projectId);

    return { deleted: true };
  }

  // ── Checklist ──

  async toggleChecklistItem(itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date() : null,
      },
    });
  }

  // ── Time entries ──

  async addTimeEntry(taskId: string, userId: string, minutes: number, date: string, description?: string) {
    return this.prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        minutes,
        date: new Date(date),
        description,
      },
    });
  }

  // ── Dependencies ──

  async addDependency(taskId: string, dependsOnTaskId: string) {
    // Prevenir dependência circular simples
    const reverse = await this.prisma.taskDependency.findUnique({
      where: { taskId_dependsOnTaskId: { taskId: dependsOnTaskId, dependsOnTaskId: taskId } },
    });
    if (reverse) {
      throw new BadRequestException('Dependência circular detectada');
    }

    return this.prisma.taskDependency.create({
      data: { taskId, dependsOnTaskId },
    });
  }
}
