import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Force IPv4 (pooler already resolves to IPv4, but just in case)
try { require('dns').setDefaultResultOrder('ipv4first'); } catch {}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pgPool: Pool;

  constructor() {
    const connStr = process.env.DATABASE_URL as string;

    const pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
    this.pgPool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      this.logger.error('Database connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pgPool.end();
  }
}
