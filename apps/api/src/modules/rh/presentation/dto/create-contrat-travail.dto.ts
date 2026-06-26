import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContratTravailType } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateContratTravailDto {
  @ApiProperty({ enum: ContratTravailType })
  @IsEnum(ContratTravailType)
  type: ContratTravailType;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiProperty({ description: 'Salaire de base en XOF.' })
  @IsNumber()
  @Min(0)
  salaireBase: number;
}
