import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../notifications/push-notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdmissionsService } from './application/admissions.service';
import { ChambresService } from './application/chambres.service';
import { LitsService } from './application/lits.service';
import { ServicesService } from './application/services.service';
import { SitesService } from './application/sites.service';
import { AdmissionEntity } from './infrastructure/entities/admission.entity';
import { ChambreEntity } from './infrastructure/entities/chambre.entity';
import { LitEntity } from './infrastructure/entities/lit.entity';
import { MouvementPatientEntity } from './infrastructure/entities/mouvement-patient.entity';
import { ServiceEntity } from './infrastructure/entities/service.entity';
import { SiteEntity } from './infrastructure/entities/site.entity';
import { AdmissionsController } from './presentation/admissions.controller';
import { ChambresController } from './presentation/chambres.controller';
import { LitsController } from './presentation/lits.controller';
import { ServicesController } from './presentation/services.controller';
import { SitesController } from './presentation/sites.controller';

@Module({
  imports: [
    // forFeature() ici sert uniquement à enregistrer les entités auprès du DataSource — les
    // services passent systématiquement par tenantContext.getManager() (RLS), voir patients.module.ts.
    TypeOrmModule.forFeature([SiteEntity, ServiceEntity, ChambreEntity, LitEntity, AdmissionEntity, MouvementPatientEntity]),
    PatientsModule,
    EtablissementsModule,
    SubscriptionsModule,
    NotificationsModule,
    PushNotificationsModule,
    AuditModule,
  ],
  controllers: [SitesController, ServicesController, ChambresController, LitsController, AdmissionsController],
  providers: [SitesService, ServicesService, ChambresService, LitsService, AdmissionsService],
  exports: [SitesService, ServicesService, ChambresService, LitsService, AdmissionsService],
})
export class AdmissionsLitsModule {}
