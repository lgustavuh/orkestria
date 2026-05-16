import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Listar tarefas do projeto' })
  findByProject(@Param('projectId') projectId: string, @Query() query: any) {
    return this.tasks.findByProject(projectId, query);
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Criar tarefa' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    const roles = user.roles as string[];
    const canAssignOthers = roles.includes('ADMIN') || roles.includes('STRATEGIST');
    if (!canAssignOthers && dto.assigneeId && dto.assigneeId !== user.sub) {
      dto.assigneeId = user.sub;
    }
    if (!dto.assigneeId && !canAssignOthers) {
      dto.assigneeId = user.sub;
    }
    return this.tasks.create(projectId, dto, user.sub);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Detalhe da tarefa' })
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Editar tarefa' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    return this.tasks.update(id, dto, user.sub, user.roles);
  }

  @Delete('tasks/:id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Excluir tarefa (Admin/Estrategista)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasks.softDelete(id, user.sub, user.roles);
  }
}
