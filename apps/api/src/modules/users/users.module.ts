import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersService } from './application/users.service';
import { RolePermissionEntity } from './infrastructure/entities/role-permission.entity';
import { UserPermissionEntity } from './infrastructure/entities/user-permission.entity';
import { UserRoleEntity } from './infrastructure/entities/user-role.entity';
import { UserEntity } from './infrastructure/entities/user.entity';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity, RolePermissionEntity, UserPermissionEntity]),
    // forwardRef : SubscriptionLifecycleService (SubscriptionsModule) a besoin de UsersService pour
    // résoudre l'email de l'admin à relancer (dunning, Phase 32) — cycle réel avec ce module-ci, qui
    // a toujours eu besoin de SubscriptionsService pour assertWithinLimit('maxUtilisateurs').
    forwardRef(() => SubscriptionsModule),
    EtablissementsModule,
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
