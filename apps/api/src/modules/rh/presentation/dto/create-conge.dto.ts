import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CongeType } from '@sih-saas/shared';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCongeDto {
  @ApiProperty({ enum: CongeType })
  @IsEnum(CongeType)
  type: CongeType;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiProperty()
  @IsDateString()
  dateFin: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  nombreJours: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;
}
