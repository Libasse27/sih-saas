import { ApiPropertyOptional } from '@nestjs/swagger';
import { DemandeMaintenanceStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateDemandeMaintenanceDto {
  @ApiPropertyOptional({ enum: DemandeMaintenanceStatut })
  @IsOptional()
  @IsEnum(DemandeMaintenanceStatut)
  statut?: DemandeMaintenanceStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicienId?: string;
}
