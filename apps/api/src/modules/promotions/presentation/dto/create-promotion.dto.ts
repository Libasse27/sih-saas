import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Libre, non interprété par le backend — pour affichage/suivi interne.' })
  @IsOptional()
  @IsObject()
  regle?: Record<string, unknown>;

  @ApiProperty()
  @IsDateString()
  periodeDebut: string;

  @ApiProperty()
  @IsDateString()
  periodeFin: string;
}
