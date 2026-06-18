import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PlansModule } from '../plans/plans.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { PaymentsService } from './application/payments.service';
import { PaymentEntity } from './infrastructure/entities/payment.entity';
import { SandboxPaymentGateway } from './infrastructure/providers/sandbox-payment-gateway';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), PlansModule, ProvisioningModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SandboxPaymentGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
