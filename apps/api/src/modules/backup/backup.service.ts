import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../files/s3.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async listBackups() {
    const backups = await this.prisma.auditLog.findMany({
      where: { action: 'CREATE' as any, resource: 'backup' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return backups.map((b: any) => ({
      id: b.id,
      createdAt: b.createdAt,
      createdBy: b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Sistema',
      fileName: b.details?.fileName || 'backup.sql',
      sizeBytes: b.details?.sizeBytes || 0,
      s3Key: b.details?.s3Key || b.details?.dbBackup || null,
      type: b.details?.type || 'db',
    }));
  }

  async createBackup(userId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `orkestria-backup-${timestamp}.sql`;
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, fileName);

    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?.*)?$/);
      if (!match) throw new BadRequestException('DATABASE_URL não configurada corretamente');

      const [, dbUser, dbPass, dbHost, dbPort, dbName] = match;
      const containerName = process.env.PG_CONTAINER || 'orkestria-postgres';

      // Try docker exec first (works on Windows/Mac/Linux with Docker)
      // Falls back to direct pg_dump if docker isn't available
      let sql = '';

      try {
        // Method 1: Run pg_dump inside Docker container
        this.logger.log(`Trying pg_dump via docker exec (${containerName})...`);
        const dockerCmd = `docker exec -e PGPASSWORD=${dbPass} ${containerName} pg_dump -U ${dbUser} -d ${dbName} -F p --no-owner --no-acl`;
        const { stdout } = await execAsync(dockerCmd, { maxBuffer: 500 * 1024 * 1024 });
        sql = stdout;
      } catch {
        try {
          // Method 2: Direct pg_dump (if installed on host)
          this.logger.log('Docker failed, trying direct pg_dump...');
          const env = { ...process.env, PGPASSWORD: dbPass };
          const cmd = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F p --no-owner --no-acl`;
          const { stdout } = await execAsync(cmd, { env, maxBuffer: 500 * 1024 * 1024 });
          sql = stdout;
        } catch {
          // Method 3: Prisma-based export (tables as JSON)
          this.logger.log('pg_dump not available, using Prisma export...');
          sql = await this.prismaExport();
        }
      }

      if (!sql || sql.length < 100) {
        throw new BadRequestException('Backup vazio - verifique a conexão com o banco');
      }

      fs.writeFileSync(filePath, sql, 'utf-8');
      const sizeBytes = fs.statSync(filePath).size;

      this.logger.log(`Backup created: ${fileName} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

      // Upload to S3
      const s3Key = `backups/${fileName}`;
      const fileBuffer = fs.readFileSync(filePath);
      await this.s3.uploadBuffer(s3Key, fileBuffer, 'application/sql');

      fs.unlinkSync(filePath);

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE' as any,
          resource: 'backup',
          details: { fileName, sizeBytes, s3Key, type: 'full', timestamp },
        },
      }).catch(() => {});

      return { success: true, fileName, sizeBytes, sizeMB: (sizeBytes / 1024 / 1024).toFixed(2), s3Key, createdAt: new Date().toISOString() };
    } catch (err: any) {
      try { fs.unlinkSync(filePath); } catch {}
      this.logger.error(`Backup failed: ${err.message}`);
      throw new BadRequestException(`Erro ao criar backup: ${err.message}`);
    }
  }

  /**
   * Fallback: export all tables via Prisma as SQL INSERT statements
   */
  private async prismaExport(): Promise<string> {
    const lines: string[] = [];
    lines.push('-- Orkestria Backup (Prisma Export)');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('');

    const tables: { name: string; model: string }[] = [
      { name: 'roles', model: 'role' },
      { name: 'users', model: 'user' },
      { name: 'user_roles', model: 'userRole' },
      { name: 'clients', model: 'client' },
      { name: 'client_users', model: 'clientUser' },
      { name: 'projects', model: 'project' },
      { name: 'project_stages', model: 'projectStage' },
      { name: 'project_members', model: 'projectMember' },
      { name: 'tasks', model: 'task' },
      { name: 'comments', model: 'comment' },
      { name: 'files', model: 'file' },
      { name: 'approvals', model: 'approval' },
      { name: 'notifications', model: 'notification' },
      { name: 'project_templates', model: 'projectTemplate' },
      { name: 'task_templates', model: 'taskTemplate' },
      { name: 'audit_logs', model: 'auditLog' },
    ];

    for (const table of tables) {
      try {
        const records = await (this.prisma as any)[table.model].findMany();
        if (records.length === 0) continue;

        lines.push(`-- Table: ${table.name} (${records.length} records)`);
        lines.push(`DELETE FROM "${table.name}";`);

        for (const record of records) {
          const cols = Object.keys(record).map(k => `"${this.toSnakeCase(k)}"`).join(', ');
          const vals = Object.values(record).map(v => this.toSqlValue(v)).join(', ');
          lines.push(`INSERT INTO "${table.name}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
        }
        lines.push('');
      } catch (err: any) {
        lines.push(`-- Skipped ${table.name}: ${err.message}`);
      }
    }

    return lines.join('\n');
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private toSqlValue(v: any): string {
    if (v === null || v === undefined) return 'NULL';
    if (v instanceof Date) return `'${v.toISOString()}'`;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  async getDownloadUrl(s3Key: string) {
    const url = await this.s3.getPresignedDownloadUrl(s3Key, s3Key.split('/').pop() || 'backup.sql');
    return { downloadUrl: url };
  }

  async restoreBackup(userId: string, s3Key: string) {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `restore-${Date.now()}.sql`);

    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?.*)?$/);
      if (!match) throw new BadRequestException('DATABASE_URL não configurada corretamente');

      const [, dbUser, dbPass, dbHost, dbPort, dbName] = match;
      const containerName = process.env.PG_CONTAINER || 'orkestria-postgres';

      // Download from S3
      this.logger.log(`Downloading backup: ${s3Key}`);
      const buffer = await this.s3.downloadObject(s3Key);
      fs.writeFileSync(filePath, buffer);

      try {
        // Method 1: Copy file into container then run psql inside it
        const containerFile = `/tmp/restore-${Date.now()}.sql`;
        await execAsync(`docker cp "${filePath}" ${containerName}:${containerFile}`);
        await execAsync(`docker exec -e PGPASSWORD=${dbPass} ${containerName} psql -U ${dbUser} -d ${dbName} -f ${containerFile}`, { maxBuffer: 500 * 1024 * 1024 });
        await execAsync(`docker exec ${containerName} rm -f ${containerFile}`).catch(() => {});
      } catch {
        try {
          // Method 2: Direct psql (Linux/Mac with pg installed)
          const env = { ...process.env, PGPASSWORD: dbPass };
          await execAsync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${filePath}"`, { env, maxBuffer: 500 * 1024 * 1024 });
        } catch (err: any) {
          throw new BadRequestException(`Erro na restauração. Certifique-se que o Docker está rodando e o container "${containerName}" está ativo.`);
        }
      }

      fs.unlinkSync(filePath);

      await this.prisma.auditLog.create({
        data: { userId, action: 'UPDATE' as any, resource: 'backup', details: { action: 'restore', s3Key } },
      }).catch(() => {});

      return { success: true, message: 'Backup restaurado com sucesso' };
    } catch (err: any) {
      try { fs.unlinkSync(filePath); } catch {}
      throw new BadRequestException(`Erro ao restaurar: ${err.message}`);
    }
  }

  async restoreFromUpload(userId: string, sqlContent: string, originalName: string) {
    const tmpDir = os.tmpdir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `restore-${timestamp}.sql`;
    const filePath = path.join(tmpDir, fileName);

    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?.*)?$/);
      if (!match) throw new BadRequestException('DATABASE_URL não configurada');

      const [, dbUser, dbPass, dbHost, dbPort, dbName] = match;
      const containerName = process.env.PG_CONTAINER || 'orkestria-postgres';

      // Save uploaded SQL to temp file
      fs.writeFileSync(filePath, sqlContent, 'utf-8');
      const sizeBytes = fs.statSync(filePath).size;

      // Upload to S3 in restore folder
      const s3Key = `restore/${fileName}`;
      const fileBuffer = fs.readFileSync(filePath);
      await this.s3.uploadBuffer(s3Key, fileBuffer, 'application/sql');

      // Restore via docker
      try {
        const containerFile = `/tmp/${fileName}`;
        await execAsync(`docker cp "${filePath}" ${containerName}:${containerFile}`);
        await execAsync(`docker exec -e PGPASSWORD=${dbPass} ${containerName} psql -U ${dbUser} -d ${dbName} -f ${containerFile}`, { maxBuffer: 500 * 1024 * 1024 });
        await execAsync(`docker exec ${containerName} rm -f ${containerFile}`).catch(() => {});
      } catch {
        try {
          const env = { ...process.env, PGPASSWORD: dbPass };
          await execAsync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${filePath}"`, { env, maxBuffer: 500 * 1024 * 1024 });
        } catch (err: any) {
          throw new BadRequestException('Erro na restauração. Verifique se o Docker está ativo.');
        }
      }

      fs.unlinkSync(filePath);

      // Audit
      await this.prisma.auditLog.create({
        data: { userId, action: 'UPDATE' as any, resource: 'backup', details: { action: 'restore_upload', originalName, s3Key, sizeBytes, timestamp } },
      }).catch(() => {});

      return { success: true, message: 'Backup restaurado com sucesso', fileName, s3Key };
    } catch (err: any) {
      try { fs.unlinkSync(filePath); } catch {}
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Erro ao restaurar: ${err.message}`);
    }
  }

  /**
   * Backup all MinIO buckets by listing and copying objects metadata
   */
  private async backupMinioMetadata(): Promise<string> {
    const lines: string[] = [];
    lines.push('-- MinIO Buckets Metadata');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    
    try {
      // List all tenants to find their buckets
      const tenants = await this.prisma.tenant.findMany({ select: { slug: true } });
      const bucketNames = ['orkestria-files', ...tenants.map(t => `${t.slug}-files`), 'backups', 'restore'];
      
      for (const bucket of bucketNames) {
        try {
          const objects = await this.s3.listObjects(bucket);
          lines.push(`\n-- Bucket: ${bucket} (${objects.length} objects)`);
          for (const obj of objects) {
            lines.push(`-- ${obj.key} (${obj.size} bytes, ${obj.lastModified})`);
          }
        } catch {
          lines.push(`-- Bucket: ${bucket} (not found or empty)`);
        }
      }
    } catch (err) {
      lines.push(`-- Error listing buckets: ${(err as any).message}`);
    }
    
    return lines.join('\n');
  }

  async createFullBackup(userId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tmpDir = os.tmpdir();

    try {
      // 1. Database backup
      const dbBackup = await this.createBackup(userId);

      // 2. MinIO metadata backup
      const minioMeta = await this.backupMinioMetadata();
      const minioFileName = `minio-metadata-${timestamp}.txt`;
      const minioPath = path.join(tmpDir, minioFileName);
      fs.writeFileSync(minioPath, minioMeta, 'utf-8');
      
      // Upload MinIO metadata to backups bucket
      const minioS3Key = `backups/${minioFileName}`;
      await this.s3.uploadBuffer(minioS3Key, fs.readFileSync(minioPath), 'text/plain');
      fs.unlinkSync(minioPath);

      // 3. Copy all tenant bucket files to backup location
      const tenants = await this.prisma.tenant.findMany({ select: { slug: true } });
      let totalFiles = 0;
      for (const tenant of tenants) {
        const bucketName = `${tenant.slug}-files`;
        try {
          const objects = await this.s3.listObjects(bucketName);
          for (const obj of objects) {
            try {
              const data = await this.s3.downloadObject(obj.key, bucketName);
              const backupKey = `backups/minio-${timestamp}/${bucketName}/${obj.key}`;
              await this.s3.uploadBuffer(backupKey, data, 'application/octet-stream');
              totalFiles++;
            } catch {}
          }
        } catch {}
      }

      // Also backup orkestria-files
      try {
        const mainObjects = await this.s3.listObjects('orkestria-files');
        for (const obj of mainObjects) {
          try {
            const data = await this.s3.downloadObject(obj.key, 'orkestria-files');
            const backupKey = `backups/minio-${timestamp}/orkestria-files/${obj.key}`;
            await this.s3.uploadBuffer(backupKey, data, 'application/octet-stream');
            totalFiles++;
          } catch {}
        }
      } catch {}

      await this.prisma.auditLog.create({
        data: { userId, action: 'CREATE' as any, resource: 'backup', details: { type: 'full', timestamp, s3Key: dbBackup.s3Key, fileName: dbBackup.fileName, sizeBytes: dbBackup.sizeBytes, dbBackup: dbBackup.s3Key, minioFiles: totalFiles } },
      }).catch(() => {});

      return {
        success: true,
        database: dbBackup,
        minio: { metadataKey: minioS3Key, totalFiles },
        message: `Backup completo: banco + ${totalFiles} arquivos do MinIO`,
      };
    } catch (err: any) {
      throw new BadRequestException(`Erro no backup completo: ${err.message}`);
    }
  }

  async deleteBackup(userId: string, s3Key: string) {
    await this.s3.deleteObject(s3Key);

    // Remove the CREATE audit entry so it disappears from listing
    await this.prisma.auditLog.deleteMany({
      where: { action: 'CREATE' as any, resource: 'backup', details: { path: ['s3Key'], equals: s3Key } },
    }).catch(() => {});

    // Log the deletion
    await this.prisma.auditLog.create({
      data: { userId, action: 'DELETE' as any, resource: 'backup', details: { s3Key, deletedAt: new Date().toISOString() } },
    }).catch(() => {});

    return { success: true, message: 'Backup excluído' };
  }
}
