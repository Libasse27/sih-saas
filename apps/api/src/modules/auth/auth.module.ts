import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { PlansModule } from '../plans/plans.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { RegistrationService } from './application/registration.service';
import { RefreshTokenEntity } from './infrastructure/entities/refresh-token.entity';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets/expiry passés explicitement à chaque sign/verify (access vs refresh)
    UsersModule,
    AuditModule,
    EtablissementsModule,
    PlansModule,
    ProvisioningModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RegistrationService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
