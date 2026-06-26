import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateInterventionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salleOperationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateHeurePrevue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  dureeEstimeeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  typeIntervention?: string;
}
