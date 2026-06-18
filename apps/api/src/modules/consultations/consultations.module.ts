import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ConsultationsService } from './application/consultations.service';
import { ConsultationEntity } from './infrastructure/entities/consultation.entity';
import { ConsultationsController } from './presentation/consultations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsultationEntity]),
    PatientsModule,
    RendezVousModule,
    SubscriptionsModule,
    AuditModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (AdmissionsService,
    // RendezVousService), utilisé via @UseGuards(CareContextGuard) dans ce module — voir care-context.guard.ts.
    AdmissionsLitsModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
