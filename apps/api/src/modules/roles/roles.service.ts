import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { userRoles: true } } } });
  }

  async findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: { userRoles: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
  }
}
