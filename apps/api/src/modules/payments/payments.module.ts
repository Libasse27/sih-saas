import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PlansModule } from '../plans/plans.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsService } from './application/payments.service';
import { PaymentEntity } from './infrastructure/entities/payment.entity';
import { OrangeMoneyPaymentGateway } from './infrastructure/providers/orange-money-payment-gateway';
import { PaymentGatewayRegistry } from './infrastructure/providers/payment-gateway-registry';
import { SandboxPaymentGateway } from './infrastructure/providers/sandbox-payment-gateway';
import { StripePaymentGateway } from './infrastructure/providers/stripe-payment-gateway';
import { WavePaymentGateway } from './infrastructure/providers/wave-payment-gateway';
import { EtablissementRenewalController } from './presentation/etablissement-renewal.controller';
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
  controllers: [PaymentsController, EtablissementRenewalController],
  providers: [
    PaymentsService,
    SandboxPaymentGateway,
    WavePaymentGateway,
    OrangeMoneyPaymentGateway,
    StripePaymentGateway,
    PaymentGatewayRegistry,
  ],
  // PaymentGatewayRegistry exporté pour être réutilisé par FacturationPatientModule (flux soins,
  // infra partagée mais modèles/endpoints strictement séparés — prompt maître §15).
  exports: [PaymentsService, PaymentGatewayRegistry],
})
export class PaymentsModule {}
