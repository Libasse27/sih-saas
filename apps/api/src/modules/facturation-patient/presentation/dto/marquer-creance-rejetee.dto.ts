import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarquerCreanceRejeteeDto {
  @ApiProperty({ description: "Motif du rejet communiqué par l'assureur." })
  @IsString()
  motifRejet: string;
}
