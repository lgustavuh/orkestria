import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AutomationTrigger } from '@prisma/client';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    projectId?: string;
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    conditions?: any;
    actions: Array<{ type: string; config: any; order: number }>;
  }) {
    return this.prisma.automation.create({
      data: {
        projectId: params.projectId,
        name: params.name,
        description: params.description,
        trigger: params.trigger,
        conditions: params.conditions,
        actions: {
          create: params.actions.map((a) => ({
            type: a.type as any,
            config: a.config,
            order: a.order,
          })),
        },
      },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(query: { projectId?: string; trigger?: string; isActive?: boolean }, tenantId?: string | null) {
    const where: any = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.trigger) where.trigger = query.trigger;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.automation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actions: { orderBy: { order: 'asc' } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const automation = await this.prisma.automation.findUnique({
      where: { id },
      include: {
        actions: { orderBy: { order: 'asc' } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');
    return automation;
  }

  async update(id: string, params: {
    name?: string;
    description?: string;
    trigger?: AutomationTrigger;
    conditions?: any;
    isActive?: boolean;
    actions?: Array<{ type: string; config: any; order: number }>;
  }) {
    // Se ações foram fornecidas, delete as antigas e recria
    if (params.actions) {
      await this.prisma.automationAction.deleteMany({ where: { automationId: id } });
    }

    return this.prisma.automation.update({
      where: { id },
      data: {
        ...(params.name && { name: params.name }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.trigger && { trigger: params.trigger }),
        ...(params.conditions !== undefined && { conditions: params.conditions }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.actions && {
          actions: {
            create: params.actions.map((a) => ({
              type: a.type as any,
              config: a.config,
              order: a.order,
            })),
          },
        }),
      },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  async delete(id: string) {
    return this.prisma.automation.delete({ where: { id } });
  }

  async findByTrigger(trigger: AutomationTrigger, projectId?: string) {
    const where: any = { trigger, isActive: true };
    if (projectId) {
      where.OR = [{ projectId }, { projectId: null }]; // Global + específicas do projeto
    }
    return this.prisma.automation.findMany({
      where,
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }
}
