import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SettingsService } from './application/settings.service';
import { SettingEntity } from './infrastructure/entities/setting.entity';
import { SettingsController } from './presentation/settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity]), AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
