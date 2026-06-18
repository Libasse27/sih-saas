import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CanalRdv } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateRendezVousDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

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

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  dureeMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;

  @ApiPropertyOptional({ enum: CanalRdv, default: CanalRdv.SUR_SITE })
  @IsOptional()
  @IsEnum(CanalRdv)
  canal?: CanalRdv;
}
