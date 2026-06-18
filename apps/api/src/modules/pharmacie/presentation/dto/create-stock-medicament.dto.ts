import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateStockMedicamentDto {
  @ApiProperty()
  @IsUUID()
  medicamentId: string;

  @ApiProperty()
  @IsString()
  lot: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantite: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  seuilAlerte: number;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  dateExpiration: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emplacement?: string;
}
