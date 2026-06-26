import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeAnesthesie } from '@sih-saas/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ProduitAnesthesieDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty()
  @IsString()
  dose: string;

  @ApiProperty()
  @IsString()
  voie: string;
}

export class CreateAnesthesieDto {
  @ApiProperty({ enum: TypeAnesthesie })
  @IsEnum(TypeAnesthesie)
  type: TypeAnesthesie;

  @ApiPropertyOptional({ description: 'Score ASA, 1 à 5.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  scoreAsa?: number;

  @ApiPropertyOptional({ type: [ProduitAnesthesieDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProduitAnesthesieDto)
  produits?: ProduitAnesthesieDto[];
}
