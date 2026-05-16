import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const token = auth.slice(7);
        // Decode JWT payload (middle segment) without library
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload?.sub) {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { tenantId: true },
          });
          (req as any).tenantId = user?.tenantId || null;
        }
      }
    } catch {}
    next();
  }
}
