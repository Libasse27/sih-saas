import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMedicamentCatalogueDto {
  @ApiProperty({ description: 'Dénomination Commune Internationale' })
  @IsString()
  dci: string;

  @ApiPropertyOptional({ description: 'Code ATC (classification anatomique, thérapeutique, chimique)' })
  @IsOptional()
  @IsString()
  codeAtc?: string;

  @ApiProperty({ example: 'comprimé' })
  @IsString()
  forme: string;

  @ApiProperty({ example: '500mg' })
  @IsString()
  dosage: string;
}
