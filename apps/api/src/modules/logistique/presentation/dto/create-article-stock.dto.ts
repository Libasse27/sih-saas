import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateArticleStockDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantite: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  seuilAlerte: number;

  @ApiProperty()
  @IsString()
  unite: string;
}
