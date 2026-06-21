import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../notifications/push-notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { RendezVousService } from './application/rendez-vous.service';
import { RendezVousEntity } from './infrastructure/entities/rendez-vous.entity';
import { RendezVousController } from './presentation/rendez-vous.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RendezVousEntity]),
    PatientsModule,
    SubscriptionsModule,
    AuditModule,
    UsersModule,
    NotificationsModule,
    PushNotificationsModule,
  ],
  controllers: [RendezVousController],
  providers: [RendezVousService],
  exports: [RendezVousService],
})
export class RendezVousModule {}
