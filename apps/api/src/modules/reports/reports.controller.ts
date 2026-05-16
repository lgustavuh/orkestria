import {
  Controller, Get, Param, Query, Res, UseGuards, Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Estatísticas do dashboard' })
  getDashboard(@CurrentUser() user: any, @CurrentTenant() tenantId: string) {
    return this.reports.getDashboardStats(user.sub, user.roles, tenantId);
  }

  @Get('projects/:id/summary')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Resumo completo do projeto' })
  getProjectSummary(@Param('id') id: string) {
    return this.reports.getProjectSummary(id);
  }

  @Get('tasks/csv')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Exportar tarefas em CSV' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportTasksCsv(
    @Query() query: { projectId?: string; status?: string; startDate?: string; endDate?: string },
    @Res() res: Response,
  ) {
    const csv = await this.reports.generateCsv(query);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tarefas_${date}.csv`);
    // BOM for Excel UTF-8 compatibility
    res.send('\uFEFF' + csv);
  }

  @Get('productivity')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Relatório de produtividade por usuário' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getProductivity(@Query() query: { startDate?: string; endDate?: string }) {
    return this.reports.getProductivityReport(query);
  }
}
