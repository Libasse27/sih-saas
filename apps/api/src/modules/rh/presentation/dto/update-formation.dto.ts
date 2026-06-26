import { ApiPropertyOptional } from '@nestjs/swagger';
import { FormationStatut } from '@sih-saas/shared';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateFormationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intitule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organisme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ enum: FormationStatut })
  @IsOptional()
  @IsEnum(FormationStatut)
  statut?: FormationStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  certificatObtenu?: boolean;
}
