import { PrismaClient } from '@prisma/client';
import { emailService } from '../services/email.service';

const prisma = new PrismaClient();

/**
 * Processes email notification jobs from the automations queue.
 * Called when an automation action type is SEND_EMAIL.
 */
export async function processEmailNotification(data: {
  config: {
    notificationType?: string;
    userIds?: string[];
    role?: string;
    title?: string;
    message?: string;
  };
  eventPayload: Record<string, any>;
  projectId?: string;
}) {
  const { config, eventPayload, projectId } = data;

  // Resolve target users
  let userIds = config.userIds || [];

  // If role specified, find project members with that role
  if (config.role && projectId) {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true },
          include: { roles: { include: { role: true } } },
        },
      },
    });

    const roleMembers = members
      .filter(m => m.user.roles.some(r => r.role.name === config.role))
      .map(m => m.userId);

    userIds = [...new Set([...userIds, ...roleMembers])];
  }

  // If specific assignee in event
  if (eventPayload.assigneeId) {
    userIds = [...new Set([...userIds, eventPayload.assigneeId])];
  }

  // Fetch user details
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: { id: true, email: true, firstName: true },
  });

  // Get project name if available
  let projectName = '';
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    projectName = project?.name || '';
  }

  // Send emails based on notification type
  const type = config.notificationType || eventPayload.type || 'SYSTEM';

  for (const user of users) {
    try {
      switch (type) {
        case 'TASK_ASSIGNED':
          await emailService.sendTaskAssigned(
            user.email,
            user.firstName,
            eventPayload.taskTitle || config.title || 'Nova tarefa',
            projectName,
          );
          break;

        case 'APPROVAL_REQUESTED':
          await emailService.sendApprovalRequest(
            user.email,
            user.firstName,
            eventPayload.approvalTitle || config.title || 'Aprovação',
            projectName,
          );
          break;

        case 'DEADLINE_APPROACHING':
          await emailService.sendDeadlineWarning(
            user.email,
            user.firstName,
            eventPayload.taskTitle || '',
            eventPayload.dueDate || '',
          );
          break;

        case 'TASK_OVERDUE':
          await emailService.sendTaskOverdue(
            user.email,
            user.firstName,
            eventPayload.taskTitle || '',
          );
          break;

        case 'FILE_SHARED':
          await emailService.sendClientDeliverable(
            user.email,
            user.firstName,
            eventPayload.fileName || '',
            projectName,
          );
          break;

        case 'FEEDBACK_RECEIVED':
          await emailService.sendFeedbackReceived(
            user.email,
            eventPayload.clientName || 'Cliente',
            projectName,
          );
          break;

        default:
          await emailService.send({
            to: user.email,
            subject: `[Orkestria] ${config.title || 'Notificação'}`,
            body: config.message || 'Você tem uma nova notificação no Orkestria.',
          });
      }

      console.log(`✉ Email sent to ${user.email} (${type})`);
    } catch (err) {
      console.error(`Failed to send email to ${user.email}:`, err);
    }
  }
}
