import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeReduction } from '@sih-saas/shared';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: TypeReduction })
  @IsEnum(TypeReduction)
  typeReduction: TypeReduction;

  @ApiProperty()
  @IsPositive()
  valeur: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Vide/absent = applicable à tous les plans.' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  planIds?: string[];

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiProperty()
  @IsDateString()
  dateFin: string;

  @ApiPropertyOptional({ default: -1, description: '-1 = illimité.' })
  @IsOptional()
  @IsInt()
  @Min(-1)
  limiteUtilisation?: number;
}
