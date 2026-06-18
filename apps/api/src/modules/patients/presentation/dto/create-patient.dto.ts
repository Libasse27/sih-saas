import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sexe } from '@sih-saas/shared';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ContactUrgenceDto } from './contact-urgence.dto';

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty()
  @IsString()
  prenom: string;

  @ApiProperty({ example: '1990-05-12' })
  @IsDateString()
  dateNaissance: string;

  @ApiProperty({ enum: Sexe })
  @IsEnum(Sexe)
  sexe: Sexe;

  @ApiPropertyOptional({ description: 'Format +221XXXXXXXXX' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assuranceId?: string;

  @ApiPropertyOptional({ type: ContactUrgenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactUrgenceDto)
  contactUrgence?: ContactUrgenceDto;
}
