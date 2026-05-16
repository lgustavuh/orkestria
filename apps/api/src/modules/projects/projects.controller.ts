import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar projetos' })
  findAll(@CurrentUser() user: any, @Query() query: any, @CurrentTenant() tenantId: string) {
    return this.projects.findAll(user.sub, user.roles, query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do projeto' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projects.findOne(id, user.sub, user.roles);
  }

  @Post()
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Criar projeto (Admin/Estrategista)' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any, @CurrentTenant() tenantId: string) {
    return this.projects.create(dto, user.sub, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Editar projeto (Admin/Estrategista)' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: any) {
    return this.projects.update(id, dto, user.sub, user.roles);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Excluir projeto (Admin/Estrategista)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projects.softDelete(id, user.sub, user.roles);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Adicionar membro ao projeto' })
  addMember(@Param('id') id: string, @Body() body: { userId: string; roleInProject?: string }, @CurrentUser() user: any) {
    return this.projects.addMember(id, body.userId, body.roleInProject);
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Remover membro do projeto' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projects.removeMember(id, userId);
  }

  @Patch(':id/stages/:stageId/advance')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Avançar etapa do projeto' })
  advanceStage(@Param('id') id: string, @Param('stageId') stageId: string) {
    return this.projects.advanceStage(id, stageId);
  }
}
