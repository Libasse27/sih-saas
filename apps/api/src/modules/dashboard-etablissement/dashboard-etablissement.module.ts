import { Module } from '@nestjs/common';
import { DashboardEtablissementService } from './application/dashboard-etablissement.service';
import { DashboardEtablissementController } from './presentation/dashboard-etablissement.controller';

@Module({
  controllers: [DashboardEtablissementController],
  providers: [DashboardEtablissementService],
})
export class DashboardEtablissementModule {}
