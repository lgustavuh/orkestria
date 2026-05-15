import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os arquivos acessíveis' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.files.findAll(user.sub, user.roles, query);
  }

  @Post('presigned-url')
  @ApiOperation({ summary: 'Gerar URL de upload presigned' })
  getPresignedUrl(
    @Body() body: {
      projectId?: string;
      taskId?: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
    @CurrentUser('sub') userId: string,
  ) {
    return this.files.getPresignedUpload({ ...body, userId });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar arquivo após upload' })
  register(
    @Body() body: {
      projectId?: string;
      taskId?: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      s3Key: string;
      s3Bucket: string;
      description?: string;
      visibility?: 'INTERNAL' | 'CLIENT_SHARED';
    },
    @CurrentUser('sub') userId: string,
  ) {
    return this.files.registerFile({ ...body, userId });
  }

  @Get('download-url')
  @ApiOperation({ summary: 'Gerar URL de download por s3Key' })
  downloadByKey(@Query('key') key: string, @CurrentUser() user: any) {
    return this.files.getDownloadUrlByKey(key, user.sub, user.roles);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Listar arquivos do projeto' })
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.files.findByProject(projectId, user.sub, user.roles);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Obter URL de download' })
  download(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.files.getDownloadUrl(id, user.sub, user.roles);
  }

  @Patch(':id/link-to-task')
  @ApiOperation({ summary: 'Vincular arquivo existente a uma tarefa' })
  linkToTask(@Param('id') id: string, @Body() body: { taskId: string }) {
    return this.files.linkToTask(id, body.taskId);
  }

  @Patch(':id/share')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Compartilhar arquivo com cliente' })
  share(@Param('id') id: string) {
    return this.files.shareWithClient(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir arquivo' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.files.softDelete(id, user.sub, user.roles);
  }
}
