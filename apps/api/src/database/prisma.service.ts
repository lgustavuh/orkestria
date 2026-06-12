import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

try { require('dns').setDefaultResultOrder('ipv4first'); } catch {}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pgPool: Pool;

  constructor() {
    const connStr = process.env.DATABASE_URL as string;

    // Supabase pooler uses dotted username (postgres.ref) which adapter-pg
    // misinterprets as hostname. Parse manually and pass the ref via options.
    let poolConfig: any;
    try {
      const url = new URL(connStr);
      const fullUser = decodeURIComponent(url.username); // postgres.tynpvm...
      const password = decodeURIComponent(url.password);
      const host = url.hostname;
      const port = parseInt(url.port) || 5432;
      const database = url.pathname.replace('/', '') || 'postgres';

      // Check if it's a Supabase pooler with dotted username
      if (fullUser.includes('.') && host.includes('pooler.supabase.com')) {
        const [, projectRef] = fullUser.split('.');
        poolConfig = {
          user: 'postgres',
          password,
          host,
          port,
          database,
          ssl: { rejectUnauthorized: false },
          // Pass project ref via connection options
          options: `project=${projectRef}`,
        };
      } else {
        poolConfig = {
          user: fullUser,
          password,
          host,
          port,
          database,
          ssl: host.includes('supabase') ? { rejectUnauthorized: false } : false,
        };
      }
    } catch {
      poolConfig = { connectionString: connStr, ssl: { rejectUnauthorized: false } };
    }

    const pool = new Pool(poolConfig);
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
