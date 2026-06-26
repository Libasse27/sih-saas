import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateConsommableInterventionDto {
  @ApiProperty()
  @IsUUID()
  articleStockId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantite: number;
}
