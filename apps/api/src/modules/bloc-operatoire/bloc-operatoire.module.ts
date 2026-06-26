import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { DossierMedicalModule } from '../dossier-medical/dossier-medical.module';
import { LogistiqueModule } from '../logistique/logistique.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InterventionsService } from './application/interventions.service';
import { SallesOperationService } from './application/salles-operation.service';
import { AnesthesieEntity } from './infrastructure/entities/anesthesie.entity';
import { CompteRenduOperatoireEntity } from './infrastructure/entities/compte-rendu-operatoire.entity';
import { ConsommableInterventionEntity } from './infrastructure/entities/consommable-intervention.entity';
import { EquipeOperatoireEntity } from './infrastructure/entities/equipe-operatoire.entity';
import { InterventionEntity } from './infrastructure/entities/intervention.entity';
import { SalleOperationEntity } from './infrastructure/entities/salle-operation.entity';
import { InterventionsController } from './presentation/interventions.controller';
import { InterventionsPatientController } from './presentation/interventions-patient.controller';
import { SallesOperationController } from './presentation/salles-operation.controller';

@Module({
  imports: [
    // forFeature() ici sert uniquement à enregistrer les entités auprès du DataSource — les
    // services passent systématiquement par tenantContext.getManager() (RLS), voir urgences.module.ts.
    TypeOrmModule.forFeature([
      SalleOperationEntity,
      InterventionEntity,
      EquipeOperatoireEntity,
      AnesthesieEntity,
      CompteRenduOperatoireEntity,
      ConsommableInterventionEntity,
    ]),
    PatientsModule,
    RendezVousModule,
    AdmissionsLitsModule,
    LogistiqueModule,
    DossierMedicalModule,
    NotificationsModule,
    SubscriptionsModule,
    AuditModule,
  ],
  controllers: [SallesOperationController, InterventionsController, InterventionsPatientController],
  providers: [SallesOperationService, InterventionsService],
  exports: [SallesOperationService, InterventionsService],
})
export class BlocOperatoireModule {}
