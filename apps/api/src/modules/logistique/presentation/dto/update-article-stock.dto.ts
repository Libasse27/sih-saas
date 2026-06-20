import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateArticleStockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quantite?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  seuilAlerte?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorie?: string;
}
