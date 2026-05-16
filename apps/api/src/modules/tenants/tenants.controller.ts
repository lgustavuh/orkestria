import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private tenants: TenantsService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Cadastro de nova agência (público)' })
  register(@Body() body: {
    agencyName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    plan?: 'STARTER' | 'PRO' | 'AGENCY';
  }) {
    return this.tenants.register(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar todos os tenants (super admin)' })
  findAll() {
    return this.tenants.findAll();
  }

  @Get('saas-metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Métricas do SaaS' })
  metrics() {
    return this.tenants.getSaasMetrics();
  }

  @Get('my-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Status do tenant do usuário logado' })
  myStatus(@CurrentUser('sub') userId: string) {
    return this.tenants.getTenantStatus(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Detalhes do tenant' })
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id/plan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Alterar plano do tenant' })
  updatePlan(@Param('id') id: string, @Body('plan') plan: 'STARTER' | 'PRO' | 'AGENCY') {
    return this.tenants.updatePlan(id, plan);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Alterar status do tenant' })
  updateStatus(@Param('id') id: string, @Body('status') status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    return this.tenants.updateStatus(id, status);
  }

  @Get(':id/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes completos do tenant' })
  details(@Param('id') id: string) {
    return this.tenants.getTenantDetails(id);
  }

  @Patch(':id/update-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar dados do tenant' })
  updateData(@Param('id') id: string, @Body() body: any) {
    return this.tenants.updateTenantData(id, body);
  }

  @Patch('users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar usuário de um tenant' })
  updateUser(@Param('userId') userId: string, @Body() body: any) {
    return this.tenants.updateTenantUser(userId, body);
  }

  @Patch('users/:userId/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resetar senha de usuário' })
  resetPassword(@Param('userId') userId: string, @Body('password') password: string) {
    return this.tenants.resetTenantUserPassword(userId, password);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar/excluir tenant' })
  remove(@Param('id') id: string) {
    return this.tenants.deleteTenant(id);
  }

  @Get(':id/limits')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verificar limites do tenant' })
  checkLimits(@Param('id') id: string) {
    return this.tenants.checkLimits(id);
  }
}
