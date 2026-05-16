import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Prisma, StageType } from '@prisma/client';

const DEFAULT_STAGES: { type: StageType; name: string; order: number }[] = [
  { type: 'BACKLOG', name: 'Backlog', order: 0 },
  { type: 'PLANNING', name: 'Planejamento', order: 1 },
  { type: 'PRODUCTION', name: 'Produção', order: 2 },
  { type: 'REVIEW', name: 'Revisão', order: 3 },
  { type: 'APPROVAL', name: 'Aprovação', order: 4 },
  { type: 'COMPLETED', name: 'Concluído', order: 5 },
];

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto, userId: string, tenantId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      // Criar projeto
      const project = await tx.project.create({
        data: {
          name: dto.name,
          tenantId: tenantId || undefined,
          description: dto.description,
          briefing: dto.briefing,
          objective: dto.objective,
          channels: dto.channels || [],
          priority: dto.priority || 'MEDIUM',
          budget: dto.budget,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          clientId: dto.clientId,
          createdById: userId,
          status: 'ACTIVE',
          // Criar estágios padrão
          stages: {
            create: DEFAULT_STAGES.map((s) => ({
              type: s.type,
              name: s.name,
              order: s.order,
              isActive: s.type === 'BACKLOG', // Primeiro estágio ativo
            })),
          },
        },
        include: {
          stages: { orderBy: { order: 'asc' } },
          client: { select: { id: true, name: true, companyName: true } },
        },
      });

      // Adicionar criador como membro
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          roleInProject: 'strategist',
        },
      });

      // Adicionar membros adicionais
      if (dto.memberIds?.length) {
        await tx.projectMember.createMany({
          data: dto.memberIds.map((memberId) => ({
            projectId: project.id,
            userId: memberId,
          })),
          skipDuplicates: true,
        });
      }

      return project;
    });
  }

  async findAll(userId: string, roles: string[], query: any, tenantId?: string | null) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      isDeleted: false,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Admin e Estrategista veem todos; demais veem apenas onde são membros
    if (!roles.includes('ADMIN') && !roles.includes('STRATEGIST')) {
      where.members = { some: { userId } };
    }

    if (query.status) {
      where.status = query.status as any;
    }
    if (query.clientId) {
      where.clientId = query.clientId;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          stages: { orderBy: { order: 'asc' }, select: { id: true, type: true, name: true, isActive: true } },
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            take: 5,
          },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, roles: string[]) {
    const project = await this.prisma.project.findUnique({
      where: { id, isDeleted: false },
      include: {
        client: true,
        stages: { orderBy: { order: 'asc' } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        tasks: {
          where: { isDeleted: false, parentTaskId: null },
          orderBy: { order: 'asc' },
          take: 50,
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            stage: { select: { id: true, name: true, type: true } },
            _count: { select: { subtasks: true, comments: true, files: true } },
          },
        },
        files: {
          where: { isDeleted: false, taskId: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { tasks: true, files: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string, roles: string[]) {
    const project = await this.prisma.project.findUnique({
      where: { id, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Apenas admin, estrategista ou criador pode editar
    if (
      !roles.includes('ADMIN') &&
      !roles.includes('STRATEGIST') &&
      project.createdById !== userId
    ) {
      throw new ForbiddenException('Sem permissão para editar este projeto');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.briefing !== undefined && { briefing: dto.briefing }),
        ...(dto.objective !== undefined && { objective: dto.objective }),
        ...(dto.channels && { channels: dto.channels }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.status && { status: dto.status }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.progress !== undefined && { progress: dto.progress }),
      },
      include: {
        client: { select: { id: true, name: true } },
        stages: { orderBy: { order: 'asc' } },
      },
    });
  }

  async softDelete(id: string, userId: string, roles: string[]) {
    if (!roles.includes('ADMIN') && !roles.includes('STRATEGIST')) {
      throw new ForbiddenException('Apenas administradores e estrategistas podem excluir projetos');
    }

    return this.prisma.project.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async addMember(projectId: string, memberId: string, roleInProject?: string) {
    return this.prisma.projectMember.create({
      data: { projectId, userId: memberId, roleInProject },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async removeMember(projectId: string, memberId: string) {
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
  }

  async advanceStage(projectId: string, stageId: string) {
    const targetStage = await this.prisma.projectStage.findUnique({
      where: { id: stageId },
    });
    if (!targetStage || targetStage.projectId !== projectId) {
      throw new NotFoundException('Etapa não encontrada neste projeto');
    }

    const allStages = await this.prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    const targetOrder = targetStage.order;

    // Transaction: update all stages based on their position relative to target
    await this.prisma.$transaction(
      allStages.map(stage => {
        if (stage.order < targetOrder) {
          // Stages BEFORE target: mark as completed
          return this.prisma.projectStage.update({
            where: { id: stage.id },
            data: {
              isActive: false,
              completedAt: stage.completedAt || new Date(),
              startedAt: stage.startedAt || new Date(),
            },
          });
        } else if (stage.id === stageId) {
          // Target stage: mark as active
          return this.prisma.projectStage.update({
            where: { id: stage.id },
            data: {
              isActive: true,
              startedAt: stage.startedAt || new Date(),
              completedAt: null,
            },
          });
        } else {
          // Stages AFTER target: reset to pending
          return this.prisma.projectStage.update({
            where: { id: stage.id },
            data: {
              isActive: false,
              completedAt: null,
              startedAt: null,
            },
          });
        }
      })
    );

    return this.prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  // Calcula progresso baseado em tarefas concluídas
  async recalculateProgress(projectId: string) {
    const counts = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: true,
    });

    const total = counts.reduce((sum, c) => sum + c._count, 0);
    const done = counts.find((c) => c.status === 'DONE')?._count || 0;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });

    return progress;
  }
}
