import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { DossierMedicalService } from './application/dossier-medical.service';
import { DOSSIER_MEDICAL_MODEL, DossierMedicalSchema } from './infrastructure/schemas/dossier-medical.schema';
import { DossierMedicalController } from './presentation/dossier-medical.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DOSSIER_MEDICAL_MODEL, schema: DossierMedicalSchema }]),
    PatientsModule,
    AuditModule,
  ],
  controllers: [DossierMedicalController],
  providers: [DossierMedicalService],
  exports: [DossierMedicalService],
})
export class DossierMedicalModule {}
