import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post('customer/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar cliente no Asaas' })
  createCustomer(
    @Param('tenantId') tenantId: string,
    @Body() body: { name: string; email: string; cpfCnpj?: string; phone?: string },
  ) {
    return this.billing.createCustomer(tenantId, body);
  }

  @Post('subscribe/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar assinatura' })
  subscribe(
    @Param('tenantId') tenantId: string,
    @Body() body: { plan: string; billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' },
  ) {
    return this.billing.createSubscription(tenantId, body.plan, body.billingType);
  }

  @Get('payment-link/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link de pagamento pendente' })
  getPaymentLink(@Param('tenantId') tenantId: string) {
    return this.billing.getSubscriptionPaymentLink(tenantId);
  }

  @Delete('subscription/:tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar assinatura' })
  cancel(@Param('tenantId') tenantId: string) {
    return this.billing.cancelSubscription(tenantId);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook do Asaas' })
  webhook(@Body() body: { event: string; payment: any }) {
    return this.billing.handleWebhook(body.event, body.payment);
  }
}
