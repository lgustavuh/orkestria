import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './common/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FilesModule } from './modules/files/files.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BillingModule } from './modules/billing/billing.module';
import { BackupModule } from './modules/backup/backup.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { AuditModule } from './modules/audit/audit.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { StagesModule } from './modules/stages/stages.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },  // 10 req/s
      { name: 'medium', ttl: 60000, limit: 100 }, // 100 req/min
      { name: 'long', ttl: 3600000, limit: 1000 }, // 1000 req/h
    ]),

    // Queue
    BullModule.forRoot({
      connection: (() => {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          try {
            const url = new URL(redisUrl);
            return {
              host: url.hostname,
              port: parseInt(url.port || '6379'),
              password: url.password || undefined,
              username: url.username !== 'default' ? url.username : undefined,
            };
          } catch { /* fall through */ }
        }
        return {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        };
      })(),
    }),

    // Core
    DatabaseModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    RolesModule,
    ClientsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    FilesModule,
    ApprovalsModule,
    NotificationsModule,
    TenantsModule,
    BillingModule,
    BackupModule,
    SchedulerModule,
    TemplatesModule,
    AutomationsModule,
    AuditModule,
    ClientPortalModule,
    StagesModule,
    ReportsModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
