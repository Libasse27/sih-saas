import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFormationDto {
  @ApiProperty()
  @IsString()
  intitule: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organisme?: string;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;
}
