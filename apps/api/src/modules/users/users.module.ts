import { Module } from '@nestjs/common';
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
    SubscriptionsModule,
    EtablissementsModule,
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
