import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DossierMedicalService } from './application/dossier-medical.service';
import { DmeAttachmentsLinkService } from './infrastructure/storage/dme-attachments-link.service';
import { DmeAttachmentsStorageService } from './infrastructure/storage/dme-attachments-storage.service';
import { DOSSIER_MEDICAL_MODEL, DossierMedicalSchema } from './infrastructure/schemas/dossier-medical.schema';
import { DossierMedicalTelechargementController } from './presentation/dossier-medical-telechargement.controller';
import { DossierMedicalController } from './presentation/dossier-medical.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DOSSIER_MEDICAL_MODEL, schema: DossierMedicalSchema }]),
    PatientsModule,
    AuditModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (AdmissionsService,
    // RendezVousService) étendu en Phase 6 — voir shared/guards/care-context.guard.ts.
    AdmissionsLitsModule,
    RendezVousModule,
    // Pièces jointes (Phase 33) : assertWithinLimit('maxStockageMo')/incrementUsage('stockageMo', ...).
    SubscriptionsModule,
    EtablissementsModule,
  ],
  // DossierMedicalTelechargementController déclaré en second : aucune collision de route avec
  // DossierMedicalController (préfixes disjoints, "patients" vs "dossier-medical"), mais on respecte
  // la convention déjà établie (Phase 24) de toujours réfléchir à l'ordre d'enregistrement.
  controllers: [DossierMedicalController, DossierMedicalTelechargementController],
  providers: [DossierMedicalService, DmeAttachmentsStorageService, DmeAttachmentsLinkService],
  exports: [DossierMedicalService],
})
export class DossierMedicalModule {}
