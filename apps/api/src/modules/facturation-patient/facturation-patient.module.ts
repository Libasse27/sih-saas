import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { PatientsModule } from '../patients/patients.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AssurancesService } from './application/assurances.service';
import { CreancesAssuranceService } from './application/creances-assurance.service';
import { FacturesPatientService } from './application/factures-patient.service';
import { PaiementsPatientService } from './application/paiements-patient.service';
import { AssuranceEntity } from './infrastructure/entities/assurance.entity';
import { CreanceAssuranceEntity } from './infrastructure/entities/creance-assurance.entity';
import { FacturePatientEntity } from './infrastructure/entities/facture-patient.entity';
import { PaiementPatientEntity } from './infrastructure/entities/paiement-patient.entity';
import { AssurancesController } from './presentation/assurances.controller';
import { CreancesAssuranceController } from './presentation/creances-assurance.controller';
import { FacturationCaisseController } from './presentation/facturation-caisse.controller';
import { FacturesPatientController } from './presentation/factures-patient.controller';
import { PaiementsPatientController } from './presentation/paiements-patient.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssuranceEntity, FacturePatientEntity, PaiementPatientEntity, CreanceAssuranceEntity]),
    SubscriptionsModule,
    EtablissementsModule,
    AuditModule,
    PatientsModule,
    // PaymentGatewayRegistry (infra partagée avec le flux abonnement, jamais PaymentsService/PaymentEntity).
    PaymentsModule,
  ],
  controllers: [
    AssurancesController,
    FacturesPatientController,
    FacturationCaisseController,
    PaiementsPatientController,
    CreancesAssuranceController,
  ],
  providers: [AssurancesService, FacturesPatientService, PaiementsPatientService, CreancesAssuranceService],
  exports: [AssurancesService, FacturesPatientService],
})
export class FacturationPatientModule {}
