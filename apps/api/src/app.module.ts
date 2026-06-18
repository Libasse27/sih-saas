import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { HealthController } from './modules/health/health.controller';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    DatabaseModule,
    SharedModule,
    AuditModule,
    UsersModule,
    AuthModule,
    EtablissementsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
