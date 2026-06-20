import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { MailService } from './application/mail.service';

@Module({
  imports: [SettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
