import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleMetier } from '@sih-saas/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlanFeaturesDto } from './plan-features.dto';
import { PlanLimitesDto } from './plan-limites.dto';
import { PlanTarifsDto } from './plan-tarifs.dto';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: PlanTarifsDto })
  @ValidateNested()
  @Type(() => PlanTarifsDto)
  tarifs: PlanTarifsDto;

  @ApiProperty({ type: PlanLimitesDto })
  @ValidateNested()
  @Type(() => PlanLimitesDto)
  limites: PlanLimitesDto;

  @ApiProperty({ enum: ModuleMetier, isArray: true })
  @IsArray()
  @IsEnum(ModuleMetier, { each: true })
  modules: ModuleMetier[];

  @ApiProperty({ type: PlanFeaturesDto })
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  features: PlanFeaturesDto;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  essaiGratuitJours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  ordreAffichage?: number;
}
