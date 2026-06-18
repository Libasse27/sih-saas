import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AllergieDto } from './allergie.dto';

export class UpdateAntecedentsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicaux?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chirurgicaux?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familiaux?: string[];

  @ApiPropertyOptional({ type: [AllergieDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllergieDto)
  allergies?: AllergieDto[];
}
