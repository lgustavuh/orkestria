import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientPortalService } from './client-portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client Portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class ClientPortalController {
  constructor(private portal: ClientPortalService) {}

  @Get('projects')
  @ApiOperation({ summary: 'Listar projetos do cliente' })
  getProjects(
    @CurrentUser('sub') userId: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.portal.getProjects(userId, query);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Detalhe do projeto (visão cliente)' })
  getProject(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.portal.getProjectDetail(projectId, userId);
  }

  @Get('projects/:id/deliverables')
  @ApiOperation({ summary: 'Entregas liberadas para o cliente' })
  getDeliverables(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.portal.getDeliverables(projectId, userId);
  }

  @Get('projects/:id/timeline')
  @ApiOperation({ summary: 'Timeline/histórico resumido' })
  getTimeline(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.portal.getProjectTimeline(projectId, userId);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Aprovações pendentes do cliente' })
  getApprovals(
    @CurrentUser('sub') userId: string,
    @Query() query: { projectId?: string; status?: string },
  ) {
    return this.portal.getApprovals(userId, query);
  }

  @Patch('approvals/:id')
  @ApiOperation({ summary: 'Resolver aprovação (aprovar/reprovar/ajustes)' })
  resolveApproval(
    @Param('id') approvalId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'; feedback?: string },
  ) {
    return this.portal.resolveApproval(approvalId, userId, body.status, body.feedback);
  }

  @Post('projects/:id/feedback')
  @ApiOperation({ summary: 'Enviar feedback/solicitação' })
  submitFeedback(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
    @Body('content') content: string,
  ) {
    return this.portal.submitFeedback(projectId, userId, content);
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Download de arquivo' })
  downloadFile(@Param('fileId') fileId: string, @CurrentUser('sub') userId: string) {
    return this.portal.getFileDownloadUrl(fileId, userId);
  }

  @Patch('profile/password')
  @ApiOperation({ summary: 'Alterar senha do portal' })
  changePassword(@CurrentUser('sub') userId: string, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.portal.changeClientPassword(userId, body.currentPassword, body.newPassword);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notificações do cliente' })
  getNotifications(
    @CurrentUser('sub') userId: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.portal.getNotifications(userId, query);
  }
}
