import { Module } from '@nestjs/common';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { ProvisioningService } from './application/provisioning.service';

@Module({
  imports: [SubscriptionsModule, EtablissementsModule, UsersModule, MailModule, AuditModule, AdmissionsLitsModule],
  providers: [ProvisioningService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
