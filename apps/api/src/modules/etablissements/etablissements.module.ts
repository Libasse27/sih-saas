import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsService } from './application/etablissements.service';
import { EtablissementEntity } from './infrastructure/entities/etablissement.entity';
import { EtablissementsController } from './presentation/etablissements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtablissementEntity]), AuditModule],
  controllers: [EtablissementsController],
  providers: [EtablissementsService],
  exports: [EtablissementsService],
})
export class EtablissementsModule {}
