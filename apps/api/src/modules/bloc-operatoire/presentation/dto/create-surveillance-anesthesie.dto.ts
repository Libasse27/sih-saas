import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSurveillanceAnesthesieDto {
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
  @IsInt()
  saturationO2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
