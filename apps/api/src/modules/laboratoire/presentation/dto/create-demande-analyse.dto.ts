import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDemandeAnalyseDto {
  @ApiProperty({ example: 'NFS' })
  @IsString()
  typeAnalyse: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  urgence?: boolean;
}
