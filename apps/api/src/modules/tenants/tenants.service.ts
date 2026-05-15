import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../files/s3.service';
import * as bcrypt from 'bcrypt';

const PLAN_LIMITS = {
  STARTER: { maxUsers: 3, maxProjects: 5, maxStorageMB: 2048 },
  PRO: { maxUsers: 10, maxProjects: 20, maxStorageMB: 10240 },
  AGENCY: { maxUsers: 999, maxProjects: 999, maxStorageMB: 51200 },
};

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService, private s3: S3Service) {}

  async register(data: {
    agencyName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    ownerDocument?: string;
    ownerPassword: string;
    plan?: 'STARTER' | 'PRO' | 'AGENCY';
  }) {
    // Validate
    if (!data.agencyName || !data.ownerEmail || !data.ownerPassword) {
      throw new BadRequestException('Campos obrigatórios: nome da agência, email e senha');
    }
    if (data.ownerPassword.length < 8) {
      throw new BadRequestException('Senha deve ter no mínimo 8 caracteres');
    }

    // Check if email already exists
    const existing = await this.prisma.user.findUnique({ where: { email: data.ownerEmail } });
    if (existing) throw new ConflictException('Este email já está cadastrado');

    // Generate slug
    const baseSlug = data.agencyName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const plan = data.plan || 'STARTER';
    const limits = PLAN_LIMITS[plan];
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create everything in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.agencyName,
          slug,
          plan,
          status: 'TRIAL',
          maxUsers: limits.maxUsers,
          maxProjects: limits.maxProjects,
          maxStorageMB: limits.maxStorageMB,
          ownerEmail: data.ownerEmail,
          trialEndsAt,
        },
      });

      // 2. Ensure ADMIN and STRATEGIST roles exist
      let adminRole = await tx.role.findFirst({ where: { name: 'ADMIN' } });
      if (!adminRole) {
        adminRole = await tx.role.create({ data: { name: 'ADMIN', description: 'Administrador' } });
      }
      let strategistRole = await tx.role.findFirst({ where: { name: 'STRATEGIST' } });
      if (!strategistRole) {
        strategistRole = await tx.role.create({ data: { name: 'STRATEGIST', description: 'Estrategista' } });
      }

      // 3. Create owner user
      const nameParts = data.ownerName.trim().split(' ');
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || '';
      const passwordHash = await bcrypt.hash(data.ownerPassword, 12);

      const user = await tx.user.create({
        data: {
          email: data.ownerEmail,
          passwordHash,
          firstName,
          lastName,
          phone: data.ownerPhone || null,
          tenantId: tenant.id,
          roles: {
            create: [
              { roleId: adminRole.id },
              { roleId: strategistRole.id },
            ],
          },
        },
      });

      return { tenant, user };
    });

    // Create dedicated bucket for the agency
    try {
      const bucketName = `${result.tenant.slug}-files`;
      await this.s3.createBucket(bucketName);
    } catch (err) {
      // Bucket creation failed but tenant was created - log and continue
      console.error('Failed to create bucket:', err);
    }

    return {
    });

    return {
      tenantId: result.tenant.id,
      slug: result.tenant.slug,
      plan: result.tenant.plan,
      trialEndsAt: result.tenant.trialEndsAt,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    };
  }

  async getSaasMetrics() {
    const [totalTenants, activeTenants, trialTenants, suspendedTenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'TRIAL' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    ]);

    const totalUsers = await this.prisma.user.count({ where: { tenantId: { not: null } } });
    const totalProjects = await this.prisma.project.count({ where: { tenantId: { not: null } } });

    // Revenue estimate
    const planPrices: Record<string, number> = { STARTER: 97, PRO: 247, AGENCY: 497 };
    const activePlans = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { plan: true },
    });
    const mrr = activePlans.reduce((sum, t) => sum + (planPrices[t.plan] || 0), 0);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await this.prisma.tenant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    return {
      totalTenants, activeTenants, trialTenants, suspendedTenants,
      cancelledTenants: totalTenants - activeTenants - trialTenants - suspendedTenants,
      totalUsers, totalProjects, mrr, recentSignups,
    };
  }

  async getTenantDetails(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true, roles: { include: { role: { select: { name: true } } } } } },
        _count: { select: { users: true, projects: true, clients: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const projects = await this.prisma.project.findMany({
      where: { tenantId: id },
      select: { id: true, name: true, status: true, progress: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { ...tenant, projects };
  }

  async updateTenantData(id: string, data: {
    name?: string;
    ownerEmail?: string;
    maxUsers?: number;
    maxProjects?: number;
    maxStorageMB?: number;
  }) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        ownerEmail: data.ownerEmail,
        maxUsers: data.maxUsers,
        maxProjects: data.maxProjects,
        maxStorageMB: data.maxStorageMB,
      },
    });
  }

  async updateTenantUser(userId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
  }

  async resetTenantUserPassword(userId: string, newPassword: string) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha resetada' };
  }

  async deleteTenant(id: string) {
    // Soft delete: suspend and deactivate all users
    await this.prisma.user.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });
    return this.prisma.tenant.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, projects: true, clients: true } },
      },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, projects: true, clients: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updatePlan(id: string, plan: 'STARTER' | 'PRO' | 'AGENCY') {
    const limits = PLAN_LIMITS[plan];
    return this.prisma.tenant.update({
      where: { id },
      data: { plan, ...limits },
    });
  }

  async updateStatus(id: string, status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }

  async getTenantStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (!user?.tenantId) return { status: 'ACTIVE', plan: 'NONE', isSuspended: false };

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) return { status: 'ACTIVE', plan: 'NONE', isSuspended: false };

    const now = new Date();
    const isTrial = tenant.status === 'TRIAL';
    const trialExpired = isTrial && tenant.trialEndsAt && tenant.trialEndsAt < now;
    const isSuspended = tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED' || trialExpired;

    // Auto-suspend if trial expired but status not yet updated
    if (trialExpired && tenant.status === 'TRIAL') {
      await this.prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'SUSPENDED' } });
    }

    const daysLeft = isTrial && tenant.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null;

    return {
      tenantId: tenant.id,
      status: trialExpired ? 'SUSPENDED' : tenant.status,
      plan: tenant.plan,
      isSuspended: !!isSuspended,
      isTrial,
      daysLeft,
      trialEndsAt: tenant.trialEndsAt,
      asaasCustomerId: tenant.asaasCustomerId,
      asaasSubscriptionId: tenant.asaasSubscriptionId,
    };
  }

  async checkLimits(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { allowed: false, reason: 'Tenant não encontrado' };

    if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      return { allowed: false, reason: 'Conta suspensa ou cancelada' };
    }

    if (tenant.status === 'TRIAL' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
      return { allowed: false, reason: 'Período de teste expirado' };
    }

    const [userCount, projectCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.project.count({ where: { tenantId } }),
    ]);

    return {
      allowed: true,
      usage: { users: userCount, maxUsers: tenant.maxUsers, projects: projectCount, maxProjects: tenant.maxProjects },
      canAddUser: userCount < tenant.maxUsers,
      canAddProject: projectCount < tenant.maxProjects,
    };
  }
}
