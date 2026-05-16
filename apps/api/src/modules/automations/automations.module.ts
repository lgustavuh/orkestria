import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationEngine } from './automation.engine';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: 'automations' }),
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationEngine],
  exports: [AutomationsService, AutomationEngine],
})
export class AutomationsModule {}
