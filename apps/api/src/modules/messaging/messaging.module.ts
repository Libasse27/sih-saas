import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../notifications/push-notifications.module';
import { PatientsModule } from '../patients/patients.module';
import { UsersModule } from '../users/users.module';
import { MessagingService } from './application/messaging.service';
import { ConversationEntity } from './infrastructure/entities/conversation.entity';
import { MessageEntity } from './infrastructure/entities/message.entity';
import { MessagingController } from './presentation/messaging.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity]),
    PatientsModule,
    UsersModule,
    NotificationsModule,
    PushNotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
