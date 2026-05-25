import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar templates de projeto' })
  findAll() { return this.templates.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do template' })
  findOne(@Param('id') id: string) { return this.templates.findOne(id); }

  @Post()
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Criar template de projeto' })
  create(@Body() body: any, @CurrentUser('sub') userId: string) {
    return this.templates.create({ ...body, userId });
  }

  @Patch(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Editar template' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.templates.update(id, body);
  }

  @Post(':id/tasks')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Adicionar tarefa ao template' })
  addTask(@Param('id') id: string, @Body() body: any) {
    return this.templates.addTask(id, body);
  }

  @Delete(':id/tasks/:taskId')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Remover tarefa do template' })
  removeTask(@Param('taskId') taskId: string) {
    return this.templates.removeTask(taskId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Excluir template' })
  delete(@Param('id') id: string) { return this.templates.delete(id); }

  @Post(':id/apply/:projectId')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Aplicar template a um projeto' })
  apply(@Param('id') id: string, @Param('projectId') projectId: string, @Body() body: { startDate: string }, @CurrentUser('sub') userId: string) {
    return this.templates.applyToProject(id, projectId, new Date(body.startDate), userId);
  }
}
