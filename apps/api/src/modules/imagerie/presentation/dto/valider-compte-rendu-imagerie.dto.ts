import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValiderCompteRenduImagerieDto {
  @ApiPropertyOptional({ description: 'Remplace la conclusion existante si fournie.' })
  @IsOptional()
  @IsString()
  conclusion?: string;
}
