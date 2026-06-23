import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NiveauTriage } from '@sih-saas/shared';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class TriageUrgenceDto {
  @ApiProperty({ enum: NiveauTriage })
  @IsEnum(NiveauTriage)
  niveau: NiveauTriage;

  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  tensionArterielle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  pouls?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  saturationO2?: number;
}
