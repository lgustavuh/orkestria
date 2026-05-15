import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

const PLAN_PRICES: Record<string, number> = {
  STARTER: 97,
  PRO: 247,
  AGENCY: 497,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.apiUrl = this.config.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3';
    this.apiKey = this.config.get('ASAAS_API_KEY') || '';
  }

  private async asaasRequest(method: string, path: string, body?: any) {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Asaas error ${res.status}: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.errors?.[0]?.description || 'Erro no Asaas');
    }
    return data;
  }

  async createCustomer(tenantId: string, data: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
  }) {
    const customer = await this.asaasRequest('POST', '/customers', {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.phone,
      externalReference: tenantId,
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { asaasCustomerId: customer.id },
    });

    return customer;
  }

  async createSubscription(tenantId: string, plan: string, billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant não encontrado');
    if (!tenant.asaasCustomerId) throw new BadRequestException('Cliente Asaas não criado');

    const price = PLAN_PRICES[plan] || PLAN_PRICES.STARTER;
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subscription = await this.asaasRequest('POST', '/subscriptions', {
      customer: tenant.asaasCustomerId,
      billingType,
      value: price,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: `Orkestria - Plano ${plan}`,
      externalReference: tenantId,
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { asaasSubscriptionId: subscription.id },
    });

    return subscription;
  }

  async getSubscriptionPaymentLink(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.asaasSubscriptionId) throw new BadRequestException('Sem assinatura');

    const payments = await this.asaasRequest('GET',
      `/subscriptions/${tenant.asaasSubscriptionId}/payments?status=PENDING&limit=1`
    );

    if (payments.data?.length > 0) {
      const payment = payments.data[0];
      if (payment.billingType === 'PIX') {
        const pix = await this.asaasRequest('GET', `/payments/${payment.id}/pixQrCode`);
        return { type: 'PIX', paymentId: payment.id, qrCode: pix.encodedImage, copyPaste: pix.payload, dueDate: payment.dueDate };
      }
      if (payment.billingType === 'BOLETO') {
        return { type: 'BOLETO', paymentId: payment.id, bankSlipUrl: payment.bankSlipUrl, dueDate: payment.dueDate };
      }
      return { type: payment.billingType, paymentId: payment.id, invoiceUrl: payment.invoiceUrl, dueDate: payment.dueDate };
    }

    return { type: 'NONE', message: 'Nenhum pagamento pendente' };
  }

  async cancelSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.asaasSubscriptionId) return { message: 'Sem assinatura ativa' };

    await this.asaasRequest('DELETE', `/subscriptions/${tenant.asaasSubscriptionId}`);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'CANCELLED', asaasSubscriptionId: null },
    });

    return { message: 'Assinatura cancelada' };
  }

  /**
   * Webhook handler - called by Asaas when payment status changes
   */
  async handleWebhook(event: string, payment: any) {
    this.logger.log(`Asaas webhook: ${event} - payment ${payment?.id}`);

    const externalRef = payment?.externalReference || payment?.subscription?.externalReference;
    if (!externalRef) return { received: true };

    const tenant = await this.prisma.tenant.findUnique({ where: { id: externalRef } });
    if (!tenant) {
      this.logger.warn(`Tenant not found for webhook: ${externalRef}`);
      return { received: true };
    }

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: 'ACTIVE' },
        });
        this.logger.log(`Tenant ${tenant.slug} activated (payment confirmed)`);
        break;

      case 'PAYMENT_OVERDUE':
        this.logger.warn(`Tenant ${tenant.slug} payment overdue`);
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: 'SUSPENDED' },
        });
        this.logger.log(`Tenant ${tenant.slug} suspended`);
        break;
    }

    return { received: true };
  }
}
