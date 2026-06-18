import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CanalRdv } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/** Le patient ne choisit jamais patientId (résolu côté serveur depuis son propre compte). */
export class CreateRendezVousPatientDto {
  @ApiProperty()
  @IsUUID()
  praticienId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: '2026-06-22T09:30:00.000Z' })
  @IsDateString()
  dateHeure: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;

  @ApiPropertyOptional({ enum: CanalRdv, default: CanalRdv.SUR_SITE })
  @IsOptional()
  @IsEnum(CanalRdv)
  canal?: CanalRdv;
}
