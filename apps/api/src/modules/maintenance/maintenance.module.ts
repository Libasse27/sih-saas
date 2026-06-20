import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MaintenanceService } from './application/maintenance.service';
import { DemandeMaintenanceEntity } from './infrastructure/entities/demande-maintenance.entity';
import { MaintenanceController } from './presentation/maintenance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DemandeMaintenanceEntity]), AuditModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
