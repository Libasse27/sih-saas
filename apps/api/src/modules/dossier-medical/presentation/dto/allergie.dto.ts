import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AllergieDto {
  @ApiProperty()
  @IsString()
  substance: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateConstatee?: string;
}
