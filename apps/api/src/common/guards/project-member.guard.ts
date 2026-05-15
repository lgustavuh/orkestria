import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId =
      request.params.projectId || request.params.id || request.body?.projectId;

    if (!projectId) return true; // Sem projectId, deixa outro guard decidir

    // Admin e Estrategista têm acesso ampliado
    if (user.roles?.includes('ADMIN')) return true;

    // Verifica se o projeto existe
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, isDeleted: false },
      select: { id: true, createdById: true, clientId: true },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Criador do projeto tem acesso
    if (project.createdById === user.sub) return true;

    // Verifica se é membro do projeto
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.sub } },
    });

    if (membership) return true;

    // Verifica se é cliente vinculado ao projeto
    if (user.roles?.includes('CLIENT') && project.clientId) {
      const clientUser = await this.prisma.clientUser.findFirst({
        where: {
          userId: user.sub,
          clientId: project.clientId,
        },
      });
      if (clientUser) return true;
    }

    throw new ForbiddenException('Você não é membro deste projeto');
  }
}
