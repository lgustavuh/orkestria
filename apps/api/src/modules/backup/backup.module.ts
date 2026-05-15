import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { DatabaseModule } from '../../database/database.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DatabaseModule, FilesModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
