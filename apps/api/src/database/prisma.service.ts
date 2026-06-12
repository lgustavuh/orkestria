import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pgPool: pg.Pool;

  constructor() {
    const connStr = process.env.DATABASE_URL as string;

    // Parse the URL to extract components and force IPv4
    let poolConfig: pg.PoolConfig;

    try {
      const url = new URL(connStr);
      poolConfig = {
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.replace('/', '') || 'postgres',
        ssl: { rejectUnauthorized: false },
        // Force IPv4 to avoid ENETUNREACH on IPv6
        connectionTimeoutMillis: 10000,
      };
    } catch {
      poolConfig = { connectionString: connStr, ssl: { rejectUnauthorized: false } };
    }

    const pool = new pg.Pool(poolConfig);
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
