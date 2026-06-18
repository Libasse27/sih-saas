import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RendezVousService } from './application/rendez-vous.service';
import { RendezVousEntity } from './infrastructure/entities/rendez-vous.entity';
import { RendezVousController } from './presentation/rendez-vous.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RendezVousEntity]), PatientsModule, SubscriptionsModule, AuditModule],
  controllers: [RendezVousController],
  providers: [RendezVousService],
  exports: [RendezVousService],
})
export class RendezVousModule {}
