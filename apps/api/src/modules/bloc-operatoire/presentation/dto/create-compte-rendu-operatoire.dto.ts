import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCompteRenduOperatoireDto {
  @ApiProperty()
  @IsString()
  diagnosticPreOperatoire: string;

  @ApiProperty()
  @IsString()
  diagnosticPostOperatoire: string;

  @ApiProperty()
  @IsString()
  techniqueUtilisee: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidents?: string;

  @ApiProperty()
  @IsString()
  contenu: string;
}
