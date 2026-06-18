import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateResultatAnalyseDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  resultats: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  valeursCritiques?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fichierUrl?: string;
}
