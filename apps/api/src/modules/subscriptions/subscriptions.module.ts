import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { MailModule } from '../mail/mail.module';
import { PlansModule } from '../plans/plans.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionLifecycleService } from './application/subscription-lifecycle.service';
import { PlanFeatureGuard } from './domain/plan-feature.guard';
import { SubscriptionEntity } from './infrastructure/entities/subscription.entity';
import { EtablissementSubscriptionsController } from './presentation/etablissement-subscriptions.controller';
import { SubscriptionsController } from './presentation/subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionEntity]),
    PlansModule,
    EtablissementsModule,
    AuditModule,
    // forwardRef : voir le commentaire symétrique dans users.module.ts.
    forwardRef(() => UsersModule),
    MailModule,
  ],
  controllers: [SubscriptionsController, EtablissementSubscriptionsController],
  providers: [SubscriptionsService, SubscriptionLifecycleService, PlanFeatureGuard],
  exports: [SubscriptionsService, PlanFeatureGuard],
})
export class SubscriptionsModule {}
