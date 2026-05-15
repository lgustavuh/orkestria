import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from './s3.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'text/plain', 'text/csv',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav',
  'application/zip', 'application/x-rar-compressed',
];

const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dll', 'com', 'scr',
  'vbs', 'js', 'wsf', 'cpl', 'hta', 'inf', 'reg', 'pif',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async findAll(userId: string, roles: string[], query: { taskId?: string; projectId?: string }) {
    const isAdmin = roles.includes('ADMIN') || roles.includes('STRATEGIST');
    const where: any = { isDeleted: false };

    if (query.taskId) {
      where.taskId = query.taskId;
    } else if (query.projectId) {
      where.projectId = query.projectId;
    } else if (!isAdmin) {
      where.project = { members: { some: { userId } } };
    }

    const files = await this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, fileName: true, originalName: true, mimeType: true,
        sizeBytes: true, createdAt: true, taskId: true, projectId: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { name: true, client: { select: { name: true } } } },
        task: { select: { title: true } },
      },
    });

    return { data: files, total: files.length };
  }

  async getPresignedUpload(params: {
    projectId?: string; taskId?: string; fileName: string;
    mimeType: string; sizeBytes: number; userId: string;
  }) {
    if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${params.mimeType}`);
    }
    if (params.sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('Arquivo excede o limite de 100MB');
    }
    const ext = params.fileName.split('.').pop()?.toLowerCase() || '';
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Extensão de arquivo bloqueada: .${ext}`);
    }

    let projectName = 'uploads';
    let tenantSlug = 'shared';
    if (params.projectId) {
      const p = await this.prisma.project.findUnique({
        where: { id: params.projectId },
        select: { name: true, tenant: { select: { slug: true } } },
      });
      if (p) {
        projectName = p.name;
        if ((p as any).tenant?.slug) tenantSlug = (p as any).tenant.slug;
      }
    }

    const result = await this.s3.getPresignedUploadUrl({
      projectId: params.projectId || 'general',
      projectName,
      tenantSlug,
      fileName: params.fileName,
      mimeType: params.mimeType,
      context: params.taskId ? 'task' : 'project',
      contextId: params.taskId || params.projectId,
    });

    return { uploadUrl: result.url, s3Key: result.key, s3Bucket: result.bucket };
  }

  async registerFile(params: {
    projectId?: string; taskId?: string; fileName: string; originalName: string;
    mimeType: string; sizeBytes: number; s3Key: string; s3Bucket: string;
    userId: string; description?: string; visibility?: 'INTERNAL' | 'CLIENT_SHARED';
  }) {
    const file = await this.prisma.file.create({
      data: {
        fileName: params.fileName,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        s3Key: params.s3Key,
        s3Bucket: params.s3Bucket,
        projectId: params.projectId,
        taskId: params.taskId,
        uploadedById: params.userId,
        description: params.description,
        visibility: params.visibility || 'INTERNAL',
      },
    });

    // Notify strategists about new file
    if (params.projectId) {
      try {
        const uploader = await this.prisma.user.findUnique({ where: { id: params.userId }, select: { firstName: true } });
        const members = await this.prisma.projectMember.findMany({
          where: { projectId: params.projectId },
          include: { user: { include: { roles: { include: { role: true } } } } },
        });
        const targets = members.filter(m =>
          m.userId !== params.userId &&
          m.user.roles.some((r: any) => ['ADMIN', 'STRATEGIST'].includes(r.role.name))
        );
        if (targets.length > 0) {
          await this.prisma.notification.createMany({
            data: targets.map(t => ({
              userId: t.userId,
              type: 'FILE_SHARED' as any,
              title: 'Arquivo enviado',
              message: `${uploader?.firstName || 'Alguém'} enviou "${params.originalName}"`,
              data: { fileId: file.id, projectId: params.projectId, taskId: params.taskId },
            })),
          }).catch(() => {});
        }
      } catch {}
    }

    return file;
  }

  async findByProject(projectId: string, userId: string, roles: string[]) {
    const files = await this.prisma.file.findMany({
      where: { projectId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fileName: true, originalName: true, mimeType: true,
        sizeBytes: true, createdAt: true, taskId: true, visibility: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { data: files, total: files.length };
  }

  async getDownloadUrl(id: string, userId: string, roles: string[]) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: { s3Key: true, s3Bucket: true, originalName: true, projectId: true, uploadedById: true },
    });
    if (!file) throw new NotFoundException('Arquivo não encontrado');

    const downloadUrl = await this.s3.getPresignedDownloadUrl(file.s3Key, file.originalName || undefined, (file as any).s3Bucket);
    return { downloadUrl };
  }

  async softDelete(id: string, userId: string, roles: string[]) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: { id: true, uploadedById: true, originalName: true },
    });
    if (!file) throw new NotFoundException('Arquivo não encontrado');

    const isAdmin = roles.includes('ADMIN') || roles.includes('STRATEGIST');
    if (!isAdmin && file.uploadedById !== userId) {
      throw new ForbiddenException('Sem permissão para excluir este arquivo');
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as any,
        resource: 'file',
        resourceId: id,
        details: { fileName: file.originalName },
      },
    }).catch(() => {});

    return this.prisma.file.update({ where: { id }, data: { isDeleted: true } });
  }

  async getDownloadUrlByKey(s3Key: string, userId?: string, roles?: string[]) {
    const file = await this.prisma.file.findFirst({
      where: { s3Key, isDeleted: false },
      include: { project: { select: { members: { select: { userId: true } } } } },
    });

    if (file && userId) {
      const isAdmin = roles?.includes('ADMIN') || roles?.includes('STRATEGIST');
      if (!isAdmin) {
        const isMember = file.project?.members.some((m: any) => m.userId === userId);
        const isUploader = file.uploadedById === userId;
        if (!isMember && !isUploader) {
          throw new ForbiddenException('Sem acesso a este arquivo');
        }
      }
    }

    const fileBucket = file?.s3Bucket || undefined;
    const url = await this.s3.getPresignedDownloadUrl(s3Key, s3Key.split('/').pop() || 'download', fileBucket);
    return { downloadUrl: url };
  }

  async linkToTask(fileId: string, taskId: string | null) {
    return this.prisma.file.update({
      where: { id: fileId },
      data: { taskId },
    });
  }

  async shareWithClient(id: string) {
    return this.prisma.file.update({
      where: { id },
      data: { visibility: 'CLIENT_SHARED' },
    });
  }
}
