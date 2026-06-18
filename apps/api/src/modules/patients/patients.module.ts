import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { UsersModule } from '../users/users.module';
import { PatientsService } from './application/patients.service';
import { PatientEntity } from './infrastructure/entities/patient.entity';
import { PatientsController } from './presentation/patients.controller';

@Module({
  // TypeOrmModule.forFeature() ici sert uniquement à enregistrer l'entité auprès du DataSource
  // (autoLoadEntities) — PatientsService n'injecte jamais ce Repository directement, il passe
  // systématiquement par tenantContext.getManager() pour respecter la RLS (voir patients.service.ts).
  imports: [TypeOrmModule.forFeature([PatientEntity]), EtablissementsModule, UsersModule, AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
