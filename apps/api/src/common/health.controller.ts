import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, 'ok' | 'error'> = {};

    // Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Memory
    const mem = process.memoryUsage();
    const healthy = Object.values(checks).every(v => v === 'ok');

    return {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      checks,
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1048576),
        heapTotalMB: Math.round(mem.heapTotal / 1048576),
        rssMB: Math.round(mem.rss / 1048576),
      },
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe for k8s/ECS' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }
}
