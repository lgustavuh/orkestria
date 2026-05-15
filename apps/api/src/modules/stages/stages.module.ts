import { Module, Controller, Get, Param, UseGuards, Injectable } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}
  async findByProject(projectId: string) {
    return this.prisma.projectStage.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
  }
}

@ApiTags('Stages') @ApiBearerAuth() @Controller('projects/:projectId/stages') @UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(private stages: StagesService) {}
  @Get() findByProject(@Param('projectId') projectId: string) { return this.stages.findByProject(projectId); }
}

@Module({ imports: [AuthModule], controllers: [StagesController], providers: [StagesService], exports: [StagesService] })
export class StagesModule {}
