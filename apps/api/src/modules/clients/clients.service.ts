import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string; companyName?: string; email?: string; phone?: string;
    website?: string; notes?: string; document?: string; documentType?: string;
    address?: string; city?: string; state?: string; zipCode?: string; country?: string; contractUrl?: string;
  }) {
    // 1. Create the client
    const client = await this.prisma.client.create({ data });

    // 2. Auto-create portal user if email is provided
    if (data.email) {
      try {
        // Check if user with this email already exists
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });

        if (!existing) {
          // Password = firstName (no spaces, lowercase) + @123
          // Ex: "Fernanda Almeida" -> "fernanda@123"
          const firstName = data.name.split(' ')[0];
          const password = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '') + '@123';
          const passwordHash = await bcrypt.hash(password, 12);

          // Find CLIENT role
          const clientRole = await this.prisma.role.findUnique({ where: { name: 'CLIENT' } });

          // Create user
          const user = await this.prisma.user.create({
            data: {
              email: data.email,
              passwordHash,
              firstName: firstName,
              lastName: data.name.split(' ').slice(1).join(' ') || '',
              phone: data.phone,
              isActive: true,
              roles: clientRole ? { create: { roleId: clientRole.id } } : undefined,
            },
          });

          // Link user to client
          await this.prisma.clientUser.create({
            data: { clientId: client.id, userId: user.id, isPrimary: true },
          });

          this.logger.log(`Portal user created for client "${data.name}": ${data.email} / ${password}`);

          return {
            ...client,
            portalUser: {
              email: data.email,
              password,
              message: `Usuário do portal criado automaticamente. Login: ${data.email} | Senha: ${password}`,
            },
          };
        } else {
          // User exists, just link to client
          const alreadyLinked = await this.prisma.clientUser.findUnique({
            where: { clientId_userId: { clientId: client.id, userId: existing.id } },
          });
          if (!alreadyLinked) {
            await this.prisma.clientUser.create({
              data: { clientId: client.id, userId: existing.id, isPrimary: true },
            });
          }
          this.logger.log(`Existing user linked to client "${data.name}": ${data.email}`);
        }
      } catch (err) {
        this.logger.error(`Failed to create portal user for client "${data.name}":`, err);
        // Don't fail the client creation if user creation fails
      }
    }

    return client;
  }

  async findAll(query: any, tenantId?: string | null) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { isActive: true };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { document: { contains: query.search.replace(/\D/g, '') } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { projects: true, clientUsers: true } },
          clientUsers: { include: { user: { select: { email: true, isActive: true } } }, take: 1 },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        clientUsers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } } } },
        projects: { select: { id: true, name: true, status: true, progress: true }, where: { isDeleted: false } },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async update(id: string, data: {
    name?: string; companyName?: string; email?: string; phone?: string;
    website?: string; notes?: string; isActive?: boolean; document?: string;
    documentType?: string; address?: string; city?: string; state?: string;
    zipCode?: string; country?: string; contractUrl?: string; logoUrl?: string;
  }) {
    return this.prisma.client.update({ where: { id }, data });
  }

  async addUser(clientId: string, userId: string, isPrimary = false) {
    return this.prisma.clientUser.create({
      data: { clientId, userId, isPrimary },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async removeUser(clientId: string, userId: string) {
    return this.prisma.clientUser.delete({
      where: { clientId_userId: { clientId, userId } },
    });
  }

  async softDelete(clientId: string) {
    // Check for active projects
    const activeProjects = await this.prisma.project.count({
      where: {
        clientId,
        isDeleted: false,
        status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] },
      },
    });

    if (activeProjects > 0) {
      throw new ForbiddenException(
        `Este cliente possui ${activeProjects} projeto(s) ativo(s). Encerre ou conclua os projetos antes de excluir o cliente.`
      );
    }

    // Deactivate client
    await this.prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });

    // Deactivate portal user
    const clientUser = await this.prisma.clientUser.findFirst({
      where: { clientId, isPrimary: true },
    });
    if (clientUser) {
      await this.prisma.user.update({
        where: { id: clientUser.userId },
        data: { isActive: false },
      });
    }

    return { message: 'Cliente desativado com sucesso' };
  }

  async updatePortalAccess(clientId: string, data: { email?: string; password?: string; avatarBase64?: string }) {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: { clientId, isPrimary: true },
      include: { user: true },
    });
    if (!clientUser) throw new NotFoundException('Usuário do portal não encontrado');

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }
    if (data.avatarBase64) updateData.avatarUrl = data.avatarBase64;

    const user = await this.prisma.user.update({
      where: { id: clientUser.userId },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    // Audit: portal access changed
    await this.prisma.auditLog.create({
      data: { userId: clientUser.userId, action: 'UPDATE' as any, resource: 'client', resourceId: clientId, details: { portalAccess: true, emailChanged: !!data.email, passwordChanged: !!data.password } },
    }).catch(() => {});

    return { user, message: 'Acesso atualizado' };
  }
}
