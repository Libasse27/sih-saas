import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInterventionDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @ApiProperty()
  @IsUUID()
  salleOperationId: string;

  @ApiProperty()
  @IsUUID()
  chirurgienPrincipalId: string;

  @ApiProperty()
  @IsString()
  typeIntervention: string;

  @ApiProperty()
  @IsDateString()
  dateHeurePrevue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  dureeEstimeeMinutes?: number;
}
