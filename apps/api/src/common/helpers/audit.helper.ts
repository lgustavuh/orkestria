import { PrismaService } from '../../database/prisma.service';

export async function logAudit(
  prisma: PrismaService,
  params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
  },
) {
  try {
    await prisma.auditLog.create({ data: params as any });
  } catch {}
}
