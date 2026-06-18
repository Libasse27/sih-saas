import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class AjouterCompteRenduDto {
  @ApiProperty({ example: 'consultation' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  contenu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  fichierUrl?: string;
}
