import {
  IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsBoolean, Min, Max, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Comments ──

export class CreateCommentDto {
  @ApiProperty({ example: 'Ótimo trabalho no layout!' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'CLIENT_VISIBLE'], default: 'INTERNAL' })
  @IsOptional()
  @IsEnum(['INTERNAL', 'CLIENT_VISIBLE'] as const)
  visibility?: 'INTERNAL' | 'CLIENT_VISIBLE';

  @ApiPropertyOptional({ description: 'ID do comentário pai (thread)' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ type: [String], description: 'IDs de usuários mencionados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUserIds?: string[];
}

// ── Approvals ──

export class CreateApprovalDto {
  @ApiPropertyOptional({ description: 'ID da tarefa vinculada' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'ID do arquivo vinculado' })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiProperty({ enum: ['INTERNAL', 'CLIENT'] })
  @IsEnum(['INTERNAL', 'CLIENT'] as const)
  type: 'INTERNAL' | 'CLIENT';

  @ApiProperty({ example: 'Aprovação dos criativos v2' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Por favor revisar as cores e tipografia' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const)
  status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

  @ApiPropertyOptional({ example: 'Precisa ajustar a paleta de cores' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

// ── Files ──

export class PresignedUploadDto {
  @ApiProperty({ example: 'proj_abc123' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ example: 'task_xyz789' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({ example: 'criativo_final.psd' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'image/vnd.adobe.photoshop' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 25600000 })
  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB
  sizeBytes: number;
}

export class RegisterFileDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  originalName: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  sizeBytes: number;

  @ApiProperty()
  @IsString()
  s3Key: string;

  @ApiProperty()
  @IsString()
  s3Bucket: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'CLIENT_SHARED'] })
  @IsOptional()
  @IsEnum(['INTERNAL', 'CLIENT_SHARED'] as const)
  visibility?: 'INTERNAL' | 'CLIENT_SHARED';
}

// ── Clients ──

export class CreateClientDto {
  @ApiProperty({ example: 'Fernanda Almeida' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Almeida & Associados' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'contato@almeida.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://almeida.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Automations ──

export class CreateAutomationDto {
  @ApiPropertyOptional({ description: 'ID do projeto (null = global)' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ example: 'Notificar ao atrasar tarefa' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['PROJECT_CREATED', 'STAGE_CHANGED', 'TASK_CREATED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'DEADLINE_APPROACHING', 'FILE_UPLOADED', 'APPROVAL_SUBMITTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'PROJECT_COMPLETED'] })
  @IsString()
  trigger: string;

  @ApiPropertyOptional({ description: 'Condições JSON para avaliar', type: 'object' })
  @IsOptional()
  conditions?: any;

  @ApiProperty({ type: 'array', description: 'Array de ações', example: [{ type: 'SEND_NOTIFICATION', config: { title: 'Tarefa atrasada' }, order: 0 }] })
  @IsArray()
  actions: Array<{ type: string; config: any; order: number }>;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger?: string;

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  actions?: Array<{ type: string; config: any; order: number }>;
}

// ── Users ──

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Costa' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'NovaSenha@2025!' })
  @IsString()
  @MinLength(8)
  password: string;
}

// ── Notifications ──

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ── Portal ──

export class PortalFeedbackDto {
  @ApiProperty({ example: 'Gostei muito do resultado! Apenas ajustar as cores do logo.' })
  @IsString()
  @MinLength(1)
  content: string;
}

export class PortalResolveApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const)
  status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}
