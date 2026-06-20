import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarquerCreancePayeeDto {
  @ApiProperty({ description: "Référence du règlement reçu de l'assureur (virement, chèque, etc.)." })
  @IsString()
  referenceReglement: string;
}
