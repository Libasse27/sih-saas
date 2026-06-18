import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { DossierMedicalModule } from '../dossier-medical/dossier-medical.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ComptesRendusImagerieService } from './application/comptes-rendus-imagerie.service';
import { DemandesImagerieService } from './application/demandes-imagerie.service';
import { CompteRenduImagerieEntity } from './infrastructure/entities/compte-rendu-imagerie.entity';
import { DemandeImagerieEntity } from './infrastructure/entities/demande-imagerie.entity';
import { DemandesImagerieController } from './presentation/demandes-imagerie.controller';
import { ImagerieFileController } from './presentation/imagerie-file.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeImagerieEntity, CompteRenduImagerieEntity]),
    SubscriptionsModule,
    AuditModule,
    NotificationsModule,
    DossierMedicalModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (utilisé par DemandesImagerieController).
    PatientsModule,
    AdmissionsLitsModule,
    RendezVousModule,
  ],
  controllers: [DemandesImagerieController, ImagerieFileController],
  providers: [DemandesImagerieService, ComptesRendusImagerieService],
  exports: [DemandesImagerieService],
})
export class ImagerieModule {}
