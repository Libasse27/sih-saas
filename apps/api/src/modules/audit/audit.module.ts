import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './application/audit.service';
import { AuditLogEntity } from './infrastructure/entities/audit-log.entity';
import { AuditLogController } from './presentation/audit-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
