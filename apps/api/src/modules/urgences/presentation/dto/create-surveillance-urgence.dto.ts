import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSurveillanceUrgenceDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  frequenceRespiratoire?: number;

  @ApiPropertyOptional({ description: 'Score de Glasgow (3-15).' })
  @IsOptional()
  @IsInt()
  glasgow?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
