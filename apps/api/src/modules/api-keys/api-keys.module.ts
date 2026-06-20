import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ApiKeysService } from './application/api-keys.service';
import { ApiKeyEntity } from './infrastructure/entities/api-key.entity';
import { ApiKeysController } from './presentation/api-keys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity]), SubscriptionsModule, AuditModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
