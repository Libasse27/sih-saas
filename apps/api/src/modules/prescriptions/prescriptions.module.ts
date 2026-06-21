import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../notifications/push-notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PrescriptionsService } from './application/prescriptions.service';
import { PrescriptionLigneEntity } from './infrastructure/entities/prescription-ligne.entity';
import { PrescriptionEntity } from './infrastructure/entities/prescription.entity';
import { PrescriptionsFileController } from './presentation/prescriptions-file.controller';
import { PrescriptionsController } from './presentation/prescriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionEntity, PrescriptionLigneEntity]),
    SubscriptionsModule,
    AuditModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (PatientsService, AdmissionsService, RendezVousService).
    PatientsModule,
    AdmissionsLitsModule,
    RendezVousModule,
    NotificationsModule,
    PushNotificationsModule,
  ],
  controllers: [PrescriptionsController, PrescriptionsFileController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
