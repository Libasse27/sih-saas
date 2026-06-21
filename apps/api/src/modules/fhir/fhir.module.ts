import { Module } from '@nestjs/common';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { ConsultationsModule } from '../consultations/consultations.module';
import { DossierMedicalModule } from '../dossier-medical/dossier-medical.module';
import { ImagerieModule } from '../imagerie/imagerie.module';
import { LaboratoireModule } from '../laboratoire/laboratoire.module';
import { PatientsModule } from '../patients/patients.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { FhirService } from './application/fhir.service';
import { FhirController } from './presentation/fhir.controller';

@Module({
  imports: [
    PatientsModule,
    DossierMedicalModule,
    ConsultationsModule,
    AdmissionsLitsModule,
    PrescriptionsModule,
    RendezVousModule,
    SubscriptionsModule,
    UsersModule,
    LaboratoireModule,
    ImagerieModule,
    AuditModule,
  ],
  controllers: [FhirController],
  providers: [FhirService],
})
export class FhirModule {}
