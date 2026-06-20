import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PlansModule } from '../plans/plans.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsService } from './application/payments.service';
import { PaymentEntity } from './infrastructure/entities/payment.entity';
import { SandboxPaymentGateway } from './infrastructure/providers/sandbox-payment-gateway';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    PlansModule,
    ProvisioningModule,
    AuditModule,
    CouponsModule,
    SettingsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, SandboxPaymentGateway],
  // SandboxPaymentGateway exporté pour être réutilisé par FacturationPatientModule (flux soins,
  // infra partagée mais modèles/endpoints strictement séparés — prompt maître §15).
  exports: [PaymentsService, SandboxPaymentGateway],
})
export class PaymentsModule {}
