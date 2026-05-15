import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; firstName: string; lastName: string; phone?: string; roleId?: string }, tenantId?: string | null) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        tenantId: tenantId || undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roles: data.roleId ? { create: { roleId: data.roleId } } : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    const { passwordHash: _, ...result } = user as any;
    return result;
  }

  async findAll(query: any, tenantId?: string | null) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.role) where.roles = { some: { role: { name: query.role } } };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true,
          roles: { include: { role: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mapped = data.map(u => ({
      ...u,
      roles: u.roles.map(r => r.role.name),
      roleDetails: u.roles.map(r => r.role),
    }));

    return { data: mapped, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, isActive: true, mfaEnabled: true, lastLoginAt: true, createdAt: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true, plan: true, status: true, trialEndsAt: true, maxUsers: true, maxProjects: true } },
        roles: { include: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return { ...user, roles: user.roles.map(r => r.role.name), roleDetails: user.roles.map(r => r.role) };
  }

  async update(id: string, data: {
    firstName?: string; lastName?: string; phone?: string; avatarUrl?: string;
    email?: string; isActive?: boolean;
  }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, isActive: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  async activate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: true } });
  }

  async changeMyPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Senha atual incorreta');
    
    if (newPassword.length < 8) throw new BadRequestException('Senha deve ter no mínimo 8 caracteres');
    
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha alterada com sucesso' };
  }

  async changePassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Senha alterada com sucesso' };
  }

  async assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.create({
      data: { userId, roleId },
      include: { role: true },
    });
  }

  async removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.deleteMany({ where: { userId, roleId } });
  }

  async deleteUser(id: string, deletedById?: string) {
    // Audit: user deleted
    await this.prisma.auditLog.create({
      data: { userId: deletedById || id, action: 'DELETE', resource: 'user', resourceId: id } as any,
    }).catch(() => {});
    // Soft delete: deactivate + anonymize
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, email: `deleted_${id}@removed.com` },
    });
  }
}
