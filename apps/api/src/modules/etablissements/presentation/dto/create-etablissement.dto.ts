import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtablissementType } from '@sih-saas/shared';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEtablissementDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty({ enum: EtablissementType })
  @IsEnum(EtablissementType)
  type: EtablissementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rccm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ninea?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional({ description: 'Format +221XXXXXXXXX' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
