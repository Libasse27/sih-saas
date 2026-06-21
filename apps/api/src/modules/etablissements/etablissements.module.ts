import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsService } from './application/etablissements.service';
import { EtablissementEntity } from './infrastructure/entities/etablissement.entity';
import { EtablissementCdpController } from './presentation/etablissement-cdp.controller';
import { EtablissementsController } from './presentation/etablissements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtablissementEntity]), AuditModule],
  // EtablissementCdpController (routes littérales /me/cdp) DOIT être enregistré avant
  // EtablissementsController (qui définit @Patch(':id/cdp')) — Nest/Express font correspondre les
  // routes dans l'ordre d'enregistrement, donc PATCH /etablissements/me/cdp serait sinon capturé par
  // :id/cdp (avec id="me"), gardé par @Scopes(Scope.PLATFORM), avant même d'atteindre ce contrôleur.
  controllers: [EtablissementCdpController, EtablissementsController],
  providers: [EtablissementsService],
  exports: [EtablissementsService],
})
export class EtablissementsModule {}
