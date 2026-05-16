import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STRATEGIST')
export class BackupController {
  constructor(private backup: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'Listar backups' })
  list() {
    return this.backup.listBackups();
  }

  @Post()
  @ApiOperation({ summary: 'Criar backup completo' })
  create(@CurrentUser('sub') userId: string) {
    return this.backup.createBackup(userId);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download de backup' })
  download(@Query('key') s3Key: string) {
    return this.backup.getDownloadUrl(s3Key);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restaurar backup' })
  restore(@CurrentUser('sub') userId: string, @Body('s3Key') s3Key: string) {
    return this.backup.restoreBackup(userId, s3Key);
  }

  @Post('restore/upload')
  @ApiOperation({ summary: 'Restaurar backup via upload de arquivo SQL' })
  restoreUpload(@CurrentUser('sub') userId: string, @Body() body: { sqlContent: string; originalName: string }) {
    return this.backup.restoreFromUpload(userId, body.sqlContent, body.originalName);
  }

  @Delete()
  @ApiOperation({ summary: 'Excluir backup' })
  remove(@CurrentUser('sub') userId: string, @Query('key') s3Key: string) {
    return this.backup.deleteBackup(userId, s3Key);
  }
}
