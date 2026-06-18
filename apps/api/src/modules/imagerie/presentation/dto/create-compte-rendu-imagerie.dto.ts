import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Écrit typiquement par le manipulateur radio (acquisition) — la conclusion peut être complétée à la validation. */
export class CreateCompteRenduImagerieDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fichierDicomUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conclusion?: string;
}
