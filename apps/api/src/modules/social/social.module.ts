import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsLitsModule } from '../admissions-lits/admissions-lits.module';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { RendezVousModule } from '../rendez-vous/rendez-vous.module';
import { SocialService } from './application/social.service';
import { NoteSocialeEntity } from './infrastructure/entities/note-sociale.entity';
import { SocialController } from './presentation/social.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NoteSocialeEntity]),
    PatientsModule,
    AuditModule,
    // Nécessaire pour que Nest résolve les dépendances de CareContextGuard (AdmissionsService,
    // RendezVousService), utilisé via @UseGuards(CareContextGuard) sur findAll — voir care-context.guard.ts.
    AdmissionsLitsModule,
    RendezVousModule,
  ],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
