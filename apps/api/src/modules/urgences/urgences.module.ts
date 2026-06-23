import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UrgencesService } from './application/urgences.service';
import { AlerteMedicaleEntity } from './infrastructure/entities/alerte-medicale.entity';
import { SurveillanceUrgenceEntity } from './infrastructure/entities/surveillance-urgence.entity';
import { TriageEntity } from './infrastructure/entities/triage.entity';
import { UrgenceEntity } from './infrastructure/entities/urgence.entity';
import { UrgencesController } from './presentation/urgences.controller';
import { UrgencesPatientController } from './presentation/urgences-patient.controller';

@Module({
  imports: [
    // forFeature() ici sert uniquement à enregistrer les entités auprès du DataSource — le
    // service passe systématiquement par tenantContext.getManager() (RLS), voir admissions-lits.module.ts.
    TypeOrmModule.forFeature([UrgenceEntity, TriageEntity, AlerteMedicaleEntity, SurveillanceUrgenceEntity]),
    PatientsModule,
    AdmissionsLitsModule,
    RendezVousModule,
    SubscriptionsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [UrgencesController, UrgencesPatientController],
  providers: [UrgencesService],
  exports: [UrgencesService],
})
export class UrgencesModule {}
