import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateConsultationDietetiqueDto {
  @ApiProperty({ example: 68.5 })
  @IsNumber()
  @Min(0)
  poidsKg: number;

  @ApiProperty({ example: 170 })
  @IsNumber()
  @Min(0)
  tailleCm: number;

  @ApiProperty()
  @IsString()
  recommandations: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regimeAlimentaire?: string;
}
