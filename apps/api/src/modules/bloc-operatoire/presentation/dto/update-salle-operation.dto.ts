import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalleOperationStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSalleOperationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipement?: string;

  @ApiPropertyOptional({
    enum: SalleOperationStatut,
    description: 'LIBRE ou MAINTENANCE uniquement — OCCUPEE est piloté automatiquement par une intervention.',
  })
  @IsOptional()
  @IsEnum(SalleOperationStatut)
  statut?: SalleOperationStatut;
}
