import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { EtablissementsService } from './application/etablissements.service';
import { EtablissementEntity } from './infrastructure/entities/etablissement.entity';
import { EtablissementCdpController } from './presentation/etablissement-cdp.controller';
import { EtablissementProfilController } from './presentation/etablissement-profil.controller';
import { EtablissementsController } from './presentation/etablissements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtablissementEntity]), AuditModule],
  // EtablissementCdpController/EtablissementProfilController (routes littérales /me/cdp, /me) DOIVENT
  // être enregistrés avant EtablissementsController (qui définit @Get(':id')/@Patch(':id/cdp')) —
  // Nest/Express font correspondre les routes dans l'ordre d'enregistrement, donc GET /etablissements/me
  // serait sinon capturé par :id (avec id="me"), gardé par @Scopes(Scope.PLATFORM), avant même
  // d'atteindre ce contrôleur (même piège que Phase 24).
  controllers: [EtablissementCdpController, EtablissementProfilController, EtablissementsController],
  providers: [EtablissementsService],
  exports: [EtablissementsService],
})
export class EtablissementsModule {}
