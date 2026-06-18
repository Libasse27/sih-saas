import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { DossierMedicalModule } from '../dossier-medical/dossier-medical.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DemandesAnalyseService } from './application/demandes-analyse.service';
import { ResultatsAnalyseService } from './application/resultats-analyse.service';
import { DemandeAnalyseEntity } from './infrastructure/entities/demande-analyse.entity';
import { ResultatAnalyseEntity } from './infrastructure/entities/resultat-analyse.entity';
import { DemandesAnalyseController } from './presentation/demandes-analyse.controller';
import { LaboratoireFileController } from './presentation/laboratoire-file.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeAnalyseEntity, ResultatAnalyseEntity]),
    SubscriptionsModule,
    AuditModule,
    NotificationsModule,
    DossierMedicalModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (utilisé par DemandesAnalyseController).
    PatientsModule,
    AdmissionsLitsModule,
    RendezVousModule,
  ],
  controllers: [DemandesAnalyseController, LaboratoireFileController],
  providers: [DemandesAnalyseService, ResultatsAnalyseService],
  exports: [DemandesAnalyseService],
})
export class LaboratoireModule {}
