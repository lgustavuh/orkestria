import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STRATEGIST')
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@Query() query: any, @CurrentTenant() tenantId: string) {
    return this.clients.findAll(query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do cliente' })
  findOne(@Param('id') id: string) {
    return this.clients.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente' })
  create(@Body() dto: any, @CurrentTenant() tenantId: string) {
    return this.clients.create(dto, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar cliente' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir cliente (verifica projetos ativos)' })
  remove(@Param('id') id: string) {
    return this.clients.softDelete(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Vincular usuário ao cliente' })
  addUser(@Param('id') id: string, @Body() body: { userId: string; isPrimary?: boolean }) {
    return this.clients.addUser(id, body.userId, body.isPrimary);
  }

  @Patch(':id/portal-access')
  @ApiOperation({ summary: 'Alterar dados de acesso do portal do cliente' })
  updatePortalAccess(@Param('id') id: string, @Body() body: { email?: string; password?: string }) {
    return this.clients.updatePortalAccess(id, body);
  }
}
