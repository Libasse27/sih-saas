import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { DossierMedicalService } from './application/dossier-medical.service';
import { DOSSIER_MEDICAL_MODEL, DossierMedicalSchema } from './infrastructure/schemas/dossier-medical.schema';
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
  ],
  controllers: [DossierMedicalController],
  providers: [DossierMedicalService],
  exports: [DossierMedicalService],
})
export class DossierMedicalModule {}
