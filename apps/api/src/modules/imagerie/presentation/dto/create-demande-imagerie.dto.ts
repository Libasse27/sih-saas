import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDemandeImagerieDto {
  @ApiProperty({ example: 'Radiographie thoracique' })
  @IsString()
  typeExamen: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  urgence?: boolean;
}
