import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

/**
 * Email service abstraction.
 * In production, swap with SES, SendGrid, or Resend.
 * For MVP, this logs emails and stores them as notifications.
 */
export class EmailService {
  async send(payload: EmailPayload): Promise<boolean> {
    // In production: call SES/SendGrid API
    // For now: log and track
    console.log(`📧 Email to: ${payload.to}`);
    console.log(`   Subject: ${payload.subject}`);
    console.log(`   Body: ${payload.body.substring(0, 100)}...`);

    // TODO: Replace with actual email provider
    // await ses.sendEmail({ ... })

    return true;
  }

  async sendTaskAssigned(userEmail: string, userName: string, taskTitle: string, projectName: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] Nova tarefa atribuída: ${taskTitle}`,
      body: `Olá ${userName},\n\nVocê foi atribuído à tarefa "${taskTitle}" no projeto "${projectName}".\n\nAcesse o Orkestria para mais detalhes.`,
    });
  }

  async sendApprovalRequest(userEmail: string, userName: string, approvalTitle: string, projectName: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] Aprovação pendente: ${approvalTitle}`,
      body: `Olá ${userName},\n\nHá uma nova solicitação de aprovação "${approvalTitle}" no projeto "${projectName}".\n\nAcesse o Orkestria para revisar.`,
    });
  }

  async sendDeadlineWarning(userEmail: string, userName: string, taskTitle: string, dueDate: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] Prazo se aproximando: ${taskTitle}`,
      body: `Olá ${userName},\n\nA tarefa "${taskTitle}" vence em ${dueDate}.\n\nAcesse o Orkestria para atualizar o progresso.`,
    });
  }

  async sendTaskOverdue(userEmail: string, userName: string, taskTitle: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] ⚠ Tarefa atrasada: ${taskTitle}`,
      body: `Olá ${userName},\n\nA tarefa "${taskTitle}" está atrasada.\n\nAcesse o Orkestria para atualizar.`,
    });
  }

  async sendClientDeliverable(userEmail: string, userName: string, fileName: string, projectName: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] Nova entrega disponível: ${projectName}`,
      body: `Olá ${userName},\n\nUma nova entrega "${fileName}" está disponível no projeto "${projectName}".\n\nAcesse seu portal para baixar.`,
    });
  }

  async sendFeedbackReceived(userEmail: string, clientName: string, projectName: string) {
    return this.send({
      to: userEmail,
      subject: `[Orkestria] Novo feedback de ${clientName}`,
      body: `Novo feedback recebido de ${clientName} no projeto "${projectName}".\n\nAcesse o Orkestria para visualizar.`,
    });
  }
}

export const emailService = new EmailService();
