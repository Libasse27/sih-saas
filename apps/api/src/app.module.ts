import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DossierMedicalModule } from './modules/dossier-medical/dossier-medical.module';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { HealthController } from './modules/health/health.controller';
import { PatientsModule } from './modules/patients/patients.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlansModule } from './modules/plans/plans.module';
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
