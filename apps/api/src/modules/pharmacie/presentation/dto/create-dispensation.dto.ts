import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class LigneDispenseeDto {
  @ApiProperty()
  @IsUUID()
  prescriptionLigneId: string;

  @ApiProperty({ description: 'Lot de stock dont la quantité est décrémentée.' })
  @IsUUID()
  stockMedicamentId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantite: number;
}

export class CreateDispensationDto {
  @ApiProperty()
  @IsUUID()
  prescriptionId: string;

  @ApiProperty({ type: [LigneDispenseeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneDispenseeDto)
  lignes: LigneDispenseeDto[];
}
