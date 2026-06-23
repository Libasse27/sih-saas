import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AdmissionsLitsModule } from './modules/admissions-lits/admissions-lits.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { DossierMedicalModule } from './modules/dossier-medical/dossier-medical.module';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { FacturationPatientModule } from './modules/facturation-patient/facturation-patient.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { HealthController } from './modules/health/health.controller';
import { ImagerieModule } from './modules/imagerie/imagerie.module';
import { LaboratoireModule } from './modules/laboratoire/laboratoire.module';
import { LogistiqueModule } from './modules/logistique/logistique.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PushNotificationsModule } from './modules/notifications/push-notifications.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PharmacieModule } from './modules/pharmacie/pharmacie.module';
import { PlansModule } from './modules/plans/plans.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { RendezVousModule } from './modules/rendez-vous/rendez-vous.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SocialModule } from './modules/social/social.module';
import { SterilisationModule } from './modules/sterilisation/sterilisation.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UrgencesModule } from './modules/urgences/urgences.module';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    // Logs structurés JSON (Phase 22, voir docs/plan-de-reprise.md) — remplace le logger console par
    // défaut de Nest pour tout `new Logger(...)` existant (aucun changement requis dans les ~7
    // services qui l'utilisent déjà) + journalise automatiquement chaque requête HTTP (méthode, URL,
    // code, durée, identifiant de corrélation). Ne journalise jamais le corps des requêtes/réponses
    // (DME, prescriptions...) — seulement les en-têtes (avec redaction) et métadonnées.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SharedModule,
    AuditModule,
    UsersModule,
    AuthModule,
    EtablissementsModule,
    PlansModule,
    CouponsModule,
    PromotionsModule,
    SettingsModule,
    SubscriptionsModule,
    PaymentsModule,
    PatientsModule,
    DossierMedicalModule,
    NotificationsModule,
    AdmissionsLitsModule,
    RendezVousModule,
    UrgencesModule,
    ConsultationsModule,
    PrescriptionsModule,
    PharmacieModule,
    LaboratoireModule,
    ImagerieModule,
    FacturationPatientModule,
    ApiKeysModule,
    FhirModule,
    MaintenanceModule,
    SterilisationModule,
    LogistiqueModule,
    SocialModule,
    PushNotificationsModule,
    MessagingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
