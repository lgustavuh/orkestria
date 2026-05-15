import { Module } from '@nestjs/common';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthModule } from '../auth/auth.module';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { userId?: string; resource?: string; action?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.resource) where.resource = query.resource;
    if (query.action) where.action = query.action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}

@ApiTags('Audit') @ApiBearerAuth() @Controller('audit') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'STRATEGIST')
export class AuditController {
  constructor(private audit: AuditService) {}
  @Get() findAll(@Query() query: any) { return this.audit.findAll(query); }
}

@Module({ imports: [AuthModule], controllers: [AuditController], providers: [AuditService] })
export class AuditModule {}
