import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { DatabaseModule } from '../../database/database.module';

let ScheduleModule: any;
try {
  ScheduleModule = require('@nestjs/schedule').ScheduleModule;
} catch {
  ScheduleModule = null;
}

@Module({
  imports: [
    ...(ScheduleModule ? [ScheduleModule.forRoot()] : []),
    DatabaseModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
