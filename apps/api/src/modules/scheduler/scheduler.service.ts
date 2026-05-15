import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

let Cron: any;
let CronExpression: any;
try {
  const schedule = require('@nestjs/schedule');
  Cron = schedule.Cron;
  CronExpression = schedule.CronExpression;
} catch {
  Cron = () => () => {};
  CronExpression = { EVERY_DAY_AT_3AM: '0 3 * * *', EVERY_DAY_AT_6AM: '0 6 * * *', EVERY_WEEK: '0 0 * * 0' };
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Suspend expired trial tenants - runs daily at 6 AM
   */
  @Cron('0 6 * * *')
  async suspendExpiredTrials() {
    try {
      const expired = await (this.prisma as any).tenant?.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: { lt: new Date() },
        },
      });

      if (!expired?.length) return;

      for (const tenant of expired) {
        await (this.prisma as any).tenant.update({
          where: { id: tenant.id },
          data: { status: 'SUSPENDED' },
        });
        this.logger.log(`Trial expired: ${tenant.name} (${tenant.slug}) suspended`);
      }

      this.logger.log(`Suspended ${expired.length} expired trial tenant(s)`);
    } catch (err) {
      this.logger.error('Trial check failed:', err);
    }
  }

  /**
   * Clean up expired refresh tokens - runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { lt: thirtyDaysAgo } },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/revoked refresh tokens`);
      }
    } catch (err) {
      this.logger.error('Token cleanup failed:', err);
    }
  }

  /**
   * Clean up old read notifications - runs weekly
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldNotifications() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.prisma.notification.deleteMany({
        where: { isRead: true, createdAt: { lt: ninetyDaysAgo } },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old notifications`);
      }
    } catch (err) {
      this.logger.error('Notification cleanup failed:', err);
    }
  }
}
