import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContratTravailStatut, ContratTravailType } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateContratTravailDto {
  @ApiPropertyOptional({ enum: ContratTravailType })
  @IsOptional()
  @IsEnum(ContratTravailType)
  type?: ContratTravailType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ description: 'Salaire de base en XOF.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaireBase?: number;

  @ApiPropertyOptional({ enum: ContratTravailStatut })
  @IsOptional()
  @IsEnum(ContratTravailStatut)
  statut?: ContratTravailStatut;
}
