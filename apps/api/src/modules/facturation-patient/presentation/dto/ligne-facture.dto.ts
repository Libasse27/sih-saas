import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class LigneFactureDto {
  @ApiProperty()
  @IsString()
  libelle: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantite: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  prixUnitaire: number;
}
