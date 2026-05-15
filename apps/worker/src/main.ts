import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { processEmailNotification } from './processors/email.processor';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

console.log('🔧 Orkestria Worker starting...');

const automationWorker = new Worker('automations', async (job: Job) => {
  const { actionType, config, eventPayload, projectId } = job.data;
  console.log(`⚡ Processing: ${actionType}`);

  switch (actionType) {
    case 'CREATE_TASK':
      await prisma.task.create({
        data: {
          projectId: projectId || config.projectId,
          title: config.title || 'Tarefa automática',
          description: config.description,
          priority: config.priority || 'MEDIUM',
          assigneeId: config.assigneeId,
          createdById: config.createdById || eventPayload.userId,
          stageId: config.stageId,
          dueDate: config.dueDays ? new Date(Date.now() + config.dueDays * 86400000) : undefined,
        },
      });
      break;

    case 'CREATE_CHECKLIST':
      if (!config.taskId && !eventPayload.taskId) break;
      await prisma.taskChecklist.create({
        data: {
          taskId: config.taskId || eventPayload.taskId,
          title: config.title || 'Checklist automático',
          items: { create: (config.items || []).map((text: string, i: number) => ({ text, order: i })) },
        },
      });
      break;

    case 'SEND_NOTIFICATION': {
      const userIds: string[] = config.userIds || [];
      if (config.role && projectId) {
        const members = await prisma.projectMember.findMany({
          where: { projectId },
          include: { user: { include: { roles: { include: { role: true } } } } },
        });
        userIds.push(...members.filter(m => m.user.roles.some(r => r.role.name === config.role)).map(m => m.userId));
      }
      if (userIds.length > 0) {
        await prisma.notification.createMany({
          data: [...new Set(userIds)].map(userId => ({
            userId, type: config.notificationType || 'SYSTEM',
            title: config.title || 'Notificação', message: config.message || '',
            data: { projectId, ...eventPayload },
          })),
        });
      }
      break;
    }

    case 'CHANGE_STATUS':
      if (eventPayload.taskId) {
        await prisma.task.update({ where: { id: eventPayload.taskId }, data: { status: config.newStatus } });
      }
      break;

    case 'ADVANCE_STAGE':
      if (projectId) {
        const stages = await prisma.projectStage.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
        const idx = stages.findIndex(s => s.isActive);
        if (idx >= 0 && idx < stages.length - 1) {
          await prisma.$transaction([
            prisma.projectStage.update({ where: { id: stages[idx].id }, data: { isActive: false, completedAt: new Date() } }),
            prisma.projectStage.update({ where: { id: stages[idx + 1].id }, data: { isActive: true, startedAt: new Date() } }),
          ]);
        }
      }
      break;

    case 'SHARE_WITH_CLIENT':
      if (eventPayload.fileId) {
        await prisma.file.update({ where: { id: eventPayload.fileId }, data: { visibility: 'CLIENT_SHARED' } });
      }
      break;

    case 'WEBHOOK':
      try {
        await fetch(config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: actionType, payload: eventPayload, projectId }) });
      } catch (err) { console.error('Webhook failed:', err); }
      break;

    case 'SEND_EMAIL':
      await processEmailNotification({ config, eventPayload, projectId });
      break;

    default:
      console.warn(`Unknown action: ${actionType}`);
  }
}, { connection, concurrency: 5 });

automationWorker.on('completed', (job) => console.log(`✅ ${job.id} done`));
automationWorker.on('failed', (job, err) => console.error(`❌ ${job?.id} failed:`, err.message));

async function checkDeadlines() {
  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 86400000);
  const yesterday = new Date(now.getTime() - 86400000);

  const approaching = await prisma.task.findMany({
    where: { dueDate: { gte: now, lte: in3d }, status: { notIn: ['DONE', 'CANCELLED'] }, isDeleted: false },
    select: { id: true, title: true, assigneeId: true, projectId: true },
  });
  for (const t of approaching) {
    if (!t.assigneeId) continue;
    const exists = await prisma.notification.findFirst({ where: { userId: t.assigneeId, type: 'DEADLINE_APPROACHING', createdAt: { gte: yesterday } } });
    if (!exists) await prisma.notification.create({ data: { userId: t.assigneeId, type: 'DEADLINE_APPROACHING', title: 'Prazo se aproximando', message: `"${t.title}" vence em breve`, data: { taskId: t.id, projectId: t.projectId } } });
  }

  const overdue = await prisma.task.findMany({
    where: { dueDate: { lt: now }, status: { notIn: ['DONE', 'CANCELLED'] }, isDeleted: false },
    select: { id: true, title: true, assigneeId: true, projectId: true, createdById: true },
  });
  for (const t of overdue) {
    for (const uid of [...new Set([t.assigneeId, t.createdById].filter(Boolean) as string[])]) {
      const exists = await prisma.notification.findFirst({ where: { userId: uid, type: 'TASK_OVERDUE', createdAt: { gte: yesterday } } });
      if (!exists) await prisma.notification.create({ data: { userId: uid, type: 'TASK_OVERDUE', title: 'Tarefa atrasada', message: `"${t.title}" está atrasada`, data: { taskId: t.id, projectId: t.projectId } } });
    }
  }
  console.log(`📅 Deadlines: ${approaching.length} approaching, ${overdue.length} overdue`);
}

setInterval(checkDeadlines, 15 * 60 * 1000);
checkDeadlines();
console.log('✅ Worker ready');

process.on('SIGTERM', async () => {
  await automationWorker.close();
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
});
