import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtablissementType, Periodicite } from '@sih-saas/shared';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  nomEtablissement: string;

  @ApiProperty({ enum: EtablissementType })
  @IsEnum(EtablissementType)
  typeEtablissement: EtablissementType;

  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: Periodicite })
  @IsEnum(Periodicite)
  periodicite: Periodicite;

  @ApiProperty()
  @IsString()
  adminNom: string;

  @ApiProperty()
  @IsString()
  adminPrenom: string;

  @ApiProperty()
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({ description: 'Format +221XXXXXXXXX' })
  @IsOptional()
  @IsString()
  adminTelephone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword: string;
}
