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
, Res, StreamableFile  } from '@nestjs/common';
import { Response } from 'express';
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
  findAll(@CurrentUser() user: any, @Query() query: any, @CurrentTenant() tenantId: string) {
    return this.files.findAll(user.sub, user.roles, query, tenantId);
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
    @CurrentTenant() tenantId: string,
  ) {
    return this.files.getPresignedUpload({ ...body, userId, tenantId });
  }

  @Post('upload-direct')
  @ApiOperation({ summary: 'Upload direto de arquivo (base64)' })
  async uploadDirect(
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.files.uploadDirect(body, user.sub, user.roles, tenantId);
  }

  @ApiOperation({ summary: 'Upload direto de arquivo' })
  async uploadDirect(
    @Req() req: any,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Parse multipart manually using busboy
    const busboy = require('busboy');
    
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
      let fileData: Buffer | null = null;
      let fileName = '';
      let mimeType = '';
      const fields: Record<string, string> = {};

      bb.on('file', (_name: string, stream: any, info: any) => {
        fileName = info.filename;
        mimeType = info.mimeType;
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => { fileData = Buffer.concat(chunks); });
      });

      bb.on('field', (name: string, val: string) => { fields[name] = val; });

      bb.on('finish', async () => {
        if (!fileData) return reject(new Error('No file uploaded'));
        try {
          const result = await this.files.uploadDirect(
            { buffer: fileData, originalname: fileName, mimetype: mimeType, size: fileData.length },
            fields, user.sub, user.roles, tenantId
          );
          resolve(result);
        } catch (e) { reject(e); }
      });

      bb.on('error', reject);
      req.pipe(bb);
    });
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
    @CurrentTenant() tenantId: string,
  ) {
    return this.files.registerFile({ ...body, userId, tenantId });
  }

  @Get('download-url')
  @ApiOperation({ summary: 'Gerar URL de download por s3Key' })
  downloadByKey(@Query('key') key: string, @CurrentUser() user: any, @CurrentTenant() tenantId: string) {
    return this.files.getDownloadUrlByKey(key, user.sub, user.roles, tenantId);
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
  @ApiOperation({ summary: 'Download de arquivo (proxy)' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { buffer, originalName, mimeType } = await this.files.downloadFile(id, user.sub, user.roles);
    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
