import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { PatientsModule } from '../patients/patients.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AssurancesService } from './application/assurances.service';
import { FacturesPatientService } from './application/factures-patient.service';
import { PaiementsPatientService } from './application/paiements-patient.service';
import { AssuranceEntity } from './infrastructure/entities/assurance.entity';
import { FacturePatientEntity } from './infrastructure/entities/facture-patient.entity';
import { PaiementPatientEntity } from './infrastructure/entities/paiement-patient.entity';
import { AssurancesController } from './presentation/assurances.controller';
import { FacturationCaisseController } from './presentation/facturation-caisse.controller';
import { FacturesPatientController } from './presentation/factures-patient.controller';
import { PaiementsPatientController } from './presentation/paiements-patient.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssuranceEntity, FacturePatientEntity, PaiementPatientEntity]),
    SubscriptionsModule,
    EtablissementsModule,
    AuditModule,
    PatientsModule,
    // SandboxPaymentGateway (infra partagée avec le flux abonnement, jamais PaymentsService/PaymentEntity).
    PaymentsModule,
  ],
  controllers: [
    AssurancesController,
    FacturesPatientController,
    FacturationCaisseController,
    PaiementsPatientController,
  ],
  providers: [AssurancesService, FacturesPatientService, PaiementsPatientService],
  exports: [AssurancesService, FacturesPatientService],
})
export class FacturationPatientModule {}
