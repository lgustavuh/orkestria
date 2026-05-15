import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ReportFilters {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  assigneeId?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getProjectSummary(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { name: true, companyName: true } },
        members: { include: { user: { select: { firstName: true, lastName: true } } } },
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true, files: true } },
      },
    });

    const taskStats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId, isDeleted: false },
      _count: true,
    });

    const tasksByAssignee = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      where: { projectId, isDeleted: false },
      _count: true,
    });

    const assigneeDetails = await this.prisma.user.findMany({
      where: { id: { in: tasksByAssignee.map(t => t.assigneeId).filter(Boolean) as string[] } },
      select: { id: true, firstName: true, lastName: true },
    });

    const timeEntries = await this.prisma.timeEntry.aggregate({
      where: { task: { projectId } },
      _sum: { minutes: true },
    });

    const overdueTasks = await this.prisma.task.count({
      where: {
        projectId,
        isDeleted: false,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    });

    return {
      project,
      taskStats: taskStats.reduce((acc, t) => ({ ...acc, [t.status]: t._count }), {}),
      tasksByAssignee: tasksByAssignee.map(t => ({
        assignee: assigneeDetails.find(a => a.id === t.assigneeId),
        count: t._count,
      })),
      totalTimeMinutes: timeEntries._sum.minutes || 0,
      overdueTasks,
    };
  }

  async getTasksReport(filters: ReportFilters) {
    const where: any = { isDeleted: false };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
        stage: { select: { name: true } },
        _count: { select: { comments: true, files: true } },
      },
    });

    return tasks;
  }

  async generateCsv(filters: ReportFilters): Promise<string> {
    const tasks = await this.getTasksReport(filters);

    const header = 'Projeto,Tarefa,Status,Prioridade,Responsável,Etapa,Prazo,Criada em,Comentários,Arquivos';
    const rows = tasks.map(t => [
      `"${t.project?.name || ''}"`,
      `"${t.title}"`,
      t.status,
      t.priority,
      t.assignee ? `"${t.assignee.firstName} ${t.assignee.lastName}"` : '',
      t.stage?.name || '',
      t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '',
      new Date(t.createdAt).toLocaleDateString('pt-BR'),
      t._count.comments,
      t._count.files,
    ].join(','));

    return [header, ...rows].join('\n');
  }

  async getProductivityReport(filters: { startDate?: string; endDate?: string }) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const timeByUser = await this.prisma.timeEntry.groupBy({
      by: ['userId'],
      where,
      _sum: { minutes: true },
      _count: true,
    });

    const userDetails = await this.prisma.user.findMany({
      where: { id: { in: timeByUser.map(t => t.userId) } },
      select: { id: true, firstName: true, lastName: true, roles: { include: { role: true } } },
    });

    const completedByUser = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        status: 'DONE',
        completedAt: where.date ? { gte: where.date.gte, lte: where.date.lte } : undefined,
      },
      _count: true,
    });

    return timeByUser.map(t => {
      const user = userDetails.find(u => u.id === t.userId);
      const completed = completedByUser.find(c => c.assigneeId === t.userId);
      return {
        user: user ? { name: `${user.firstName} ${user.lastName}`, roles: user.roles.map(r => r.role.name) } : null,
        totalMinutes: t._sum.minutes || 0,
        totalHours: Math.round(((t._sum.minutes || 0) / 60) * 10) / 10,
        entries: t._count,
        tasksCompleted: completed?._count || 0,
      };
    });
  }

  async getDashboardStats(userId: string, roles: string[]) {
    const isAdmin = roles.includes('ADMIN') || roles.includes('STRATEGIST');

    const projectWhere: any = { isDeleted: false };
    const taskWhere: any = { isDeleted: false };
    if (!isAdmin) {
      projectWhere.members = { some: { userId } };
      taskWhere.assigneeId = userId;
    }

    const [
      totalProjects,
      activeProjects,
      totalTasks,
      myPendingTasks,
      overdueTasks,
      pendingApprovals,
      recentActivity,
      statusGroups,
    ] = await Promise.all([
      this.prisma.project.count({ where: projectWhere }),
      this.prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
      this.prisma.task.count({ where: taskWhere }),
      this.prisma.task.count({ where: { assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] }, isDeleted: false } }),
      this.prisma.task.count({ where: { assigneeId: userId, dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] }, isDeleted: false } }),
      this.prisma.approval.count({ where: { status: 'PENDING' } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { firstName: true, lastName: true } } } }),
      this.prisma.task.groupBy({ by: ['status'], where: taskWhere, _count: true }),
    ]);

    const tasksByStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      tasksByStatus[g.status] = g._count;
    }

    return {
      totalProjects, activeProjects, totalTasks, myPendingTasks,
      overdueTasks, pendingApprovals, recentActivity, tasksByStatus,
    };
  }
}
