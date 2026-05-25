import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_STAGES = ['Backlog', 'Planejamento', 'Produção', 'Revisão', 'Aprovação', 'Concluído'];

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId?: string | null) {
    const where: any = { isActive: true };
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.projectTemplate.findMany({
      where,
      include: {
        tasks: { orderBy: { order: 'asc' } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.projectTemplate.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { order: 'asc' } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  async create(data: {
    name: string;
    description?: string;
    category?: string;
    stages?: string[];
    userId: string;
    tasks?: {
      title: string;
      description?: string;
      stage: string;
      priority?: string;
      assigneeRole?: string;
      dueDaysOffset?: number;
      dependsOnIndex?: number;
      estimatedHours?: number;
      order?: number;
    }[];
  }) {
    return this.prisma.projectTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        stages: data.stages || DEFAULT_STAGES,
        createdById: data.userId,
        tasks: data.tasks?.length ? {
          create: data.tasks.map((t, i) => ({
            title: t.title,
            description: t.description,
            stage: t.stage,
            priority: (t.priority as any) || 'MEDIUM',
            assigneeRole: t.assigneeRole,
            dueDaysOffset: t.dueDaysOffset || 0,
            dependsOnIndex: t.dependsOnIndex,
            estimatedHours: t.estimatedHours,
            order: t.order ?? i,
          })),
        } : undefined,
      },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.projectTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        stages: data.stages,
      },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });
  }

  async addTask(templateId: string, task: any) {
    const count = await this.prisma.taskTemplate.count({ where: { projectTemplateId: templateId } });
    return this.prisma.taskTemplate.create({
      data: {
        projectTemplateId: templateId,
        title: task.title,
        description: task.description,
        stage: task.stage,
        priority: task.priority || 'MEDIUM',
        assigneeRole: task.assigneeRole,
        dueDaysOffset: task.dueDaysOffset || 0,
        dependsOnIndex: task.dependsOnIndex,
        estimatedHours: task.estimatedHours,
        order: task.order ?? count,
      },
    });
  }

  async removeTask(taskId: string) {
    return this.prisma.taskTemplate.delete({ where: { id: taskId } });
  }

  async delete(id: string) {
    return this.prisma.projectTemplate.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Apply a template to a project: creates tasks with calculated dates and auto-assigns by role
   */
  async applyToProject(templateId: string, projectId: string, startDate: Date, userId: string) {
    const template = await this.findOne(templateId);

    // Get project members to auto-assign by role
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    // Get project stages
    const stages = await this.prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    const createdTasks: any[] = [];

    for (const taskTemplate of template.tasks) {
      // Calculate due date
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + taskTemplate.dueDaysOffset);

      // Find assignee by role
      let assigneeId: string | null = null;
      if (taskTemplate.assigneeRole) {
        const member = members.find(m =>
          m.user.roles.some(r => r.role.name === taskTemplate.assigneeRole)
        );
        if (member) assigneeId = member.userId;
      }

      // Find stage
      const stage = stages.find(s => s.name.toLowerCase() === taskTemplate.stage.toLowerCase());

      const task = await this.prisma.task.create({
        data: {
          projectId,
          title: taskTemplate.title,
          description: taskTemplate.description,
          status: 'TODO',
          priority: taskTemplate.priority,
          assigneeId,
          createdById: userId,
          stageId: stage?.id,
          dueDate,
          estimatedHours: taskTemplate.estimatedHours,
          order: taskTemplate.order,
        },
      });

      createdTasks.push(task);
    }

    return { tasksCreated: createdTasks.length, tasks: createdTasks };
  }
}
