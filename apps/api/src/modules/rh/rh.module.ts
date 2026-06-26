import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CongesService } from './application/conges.service';
import { ContratsTravailService } from './application/contrats-travail.service';
import { EmployesService } from './application/employes.service';
import { FormationsService } from './application/formations.service';
import { PresencesService } from './application/presences.service';
import { CongeEntity } from './infrastructure/entities/conge.entity';
import { ContratTravailEntity } from './infrastructure/entities/contrat-travail.entity';
import { EmployeEntity } from './infrastructure/entities/employe.entity';
import { FormationEntity } from './infrastructure/entities/formation.entity';
import { PresenceEntity } from './infrastructure/entities/presence.entity';
import { CongesController } from './presentation/conges.controller';
import { ContratsTravailController } from './presentation/contrats-travail.controller';
import { EmployesController } from './presentation/employes.controller';
import { FormationsController } from './presentation/formations.controller';
import { PresencesController } from './presentation/presences.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeEntity, ContratTravailEntity, CongeEntity, PresenceEntity, FormationEntity]),
    SubscriptionsModule,
    AuditModule,
  ],
  controllers: [EmployesController, ContratsTravailController, CongesController, PresencesController, FormationsController],
  providers: [EmployesService, ContratsTravailService, CongesService, PresencesService, FormationsService],
  exports: [EmployesService],
})
export class RhModule {}
