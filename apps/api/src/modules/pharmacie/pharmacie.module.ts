import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdministrationService } from './application/administration.service';
import { DispensationsService } from './application/dispensations.service';
import { MedicamentsCatalogueService } from './application/medicaments-catalogue.service';
import { StockMedicamentService } from './application/stock-medicament.service';
import { AdministrationMedicamentEntity } from './infrastructure/entities/administration-medicament.entity';
import { DispensationEntity } from './infrastructure/entities/dispensation.entity';
import { MedicamentCatalogueEntity } from './infrastructure/entities/medicament-catalogue.entity';
import { StockMedicamentEntity } from './infrastructure/entities/stock-medicament.entity';
import { AdministrationController } from './presentation/administration.controller';
import { DispensationsController } from './presentation/dispensations.controller';
import { MedicamentsCatalogueController } from './presentation/medicaments-catalogue.controller';
import { StockMedicamentController } from './presentation/stock-medicament.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicamentCatalogueEntity,
      StockMedicamentEntity,
      DispensationEntity,
      AdministrationMedicamentEntity,
    ]),
    SubscriptionsModule,
    AuditModule,
    NotificationsModule,
    PrescriptionsModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (utilisé par AdministrationController).
    PatientsModule,
    AdmissionsLitsModule,
    RendezVousModule,
  ],
  controllers: [
    MedicamentsCatalogueController,
    StockMedicamentController,
    DispensationsController,
    AdministrationController,
  ],
  providers: [MedicamentsCatalogueService, StockMedicamentService, DispensationsService, AdministrationService],
  exports: [MedicamentsCatalogueService, StockMedicamentService],
})
export class PharmacieModule {}
