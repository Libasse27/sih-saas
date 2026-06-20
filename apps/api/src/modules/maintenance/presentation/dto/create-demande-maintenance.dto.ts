import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDemandeMaintenanceDto {
  @ApiProperty()
  @IsString()
  equipement: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localisation?: string;

  @ApiProperty()
  @IsString()
  description: string;
}
