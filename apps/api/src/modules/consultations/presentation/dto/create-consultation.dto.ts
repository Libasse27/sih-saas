import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

/** `patientId` n'est pas un champ ici : il vient toujours du paramètre de route (CareContextGuard). */
export class CreateConsultationDto {
  @ApiPropertyOptional({ description: 'Si renseigné, le RDV est automatiquement passé à TERMINE.' })
  @IsOptional()
  @IsUUID()
  rendezVousId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @ApiProperty()
  @IsString()
  motif: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examenClinique?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosticCim10?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conclusion?: string;
}
