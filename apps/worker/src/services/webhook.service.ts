/**
 * Webhook integration service for external platforms.
 * Supports Slack and generic HTTP webhooks.
 */
export class WebhookService {
  /**
   * Send a Slack notification via incoming webhook.
   */
  static async sendSlack(webhookUrl: string, payload: {
    projectName?: string;
    title: string;
    message: string;
    color?: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
    actionUrl?: string;
  }) {
    const attachment: any = {
      color: payload.color || '#4f46e5',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${payload.title}*\n${payload.message}`,
          },
        },
      ],
    };

    if (payload.projectName) {
      attachment.blocks[0].text.text = `📁 *${payload.projectName}*\n*${payload.title}*\n${payload.message}`;
    }

    if (payload.fields?.length) {
      attachment.blocks.push({
        type: 'section',
        fields: payload.fields.map(f => ({
          type: 'mrkdwn',
          text: `*${f.title}*\n${f.value}`,
        })),
      });
    }

    if (payload.actionUrl) {
      attachment.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver no Orkestria' },
            url: payload.actionUrl,
            style: 'primary',
          },
        ],
      });
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: [attachment] }),
      });

      if (!res.ok) {
        console.error(`Slack webhook failed: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Slack webhook error:', err);
      return false;
    }
  }

  /**
   * Send a generic HTTP webhook (POST with JSON body).
   */
  static async sendGeneric(url: string, payload: {
    event: string;
    data: any;
    timestamp: string;
    signature?: string;
  }) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (payload.signature) {
        headers['X-Webhook-Signature'] = payload.signature;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      return { success: res.ok, status: res.status };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Pre-built Slack messages for common events.
   */
  static formatProjectCreated(projectName: string, createdBy: string, url: string) {
    return {
      title: 'Novo projeto criado',
      message: `*${createdBy}* criou o projeto *${projectName}*`,
      color: '#4f46e5',
      projectName,
      actionUrl: url,
    };
  }

  static formatTaskOverdue(taskTitle: string, assignee: string, projectName: string, url: string) {
    return {
      title: '⚠️ Tarefa atrasada',
      message: `A tarefa *${taskTitle}* atribuída a *${assignee}* está atrasada`,
      color: '#ef4444',
      projectName,
      actionUrl: url,
    };
  }

  static formatApprovalNeeded(title: string, requestedBy: string, projectName: string, url: string) {
    return {
      title: '👀 Aprovação pendente',
      message: `*${requestedBy}* enviou *${title}* para aprovação`,
      color: '#f59e0b',
      projectName,
      actionUrl: url,
    };
  }

  static formatDeliveryShared(fileName: string, projectName: string, url: string) {
    return {
      title: '📎 Entrega disponível',
      message: `O arquivo *${fileName}* foi liberado para o cliente`,
      color: '#10b981',
      projectName,
      actionUrl: url,
    };
  }
}
