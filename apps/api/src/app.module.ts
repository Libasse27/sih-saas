import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AdmissionsLitsModule } from './modules/admissions-lits/admissions-lits.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { DossierMedicalModule } from './modules/dossier-medical/dossier-medical.module';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { HealthController } from './modules/health/health.controller';
import { ImagerieModule } from './modules/imagerie/imagerie.module';
import { LaboratoireModule } from './modules/laboratoire/laboratoire.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PharmacieModule } from './modules/pharmacie/pharmacie.module';
import { PlansModule } from './modules/plans/plans.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { RendezVousModule } from './modules/rendez-vous/rendez-vous.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SharedModule,
    AuditModule,
    UsersModule,
    AuthModule,
    EtablissementsModule,
    PlansModule,
    SubscriptionsModule,
    PaymentsModule,
    PatientsModule,
    DossierMedicalModule,
    NotificationsModule,
    AdmissionsLitsModule,
    RendezVousModule,
    ConsultationsModule,
    PrescriptionsModule,
    PharmacieModule,
    LaboratoireModule,
    ImagerieModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
