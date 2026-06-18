import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ExtendSubscriptionDto {
  @ApiProperty({ description: 'Nombre de jours ajoutés à la date de fin courante' })
  @IsInt()
  @Min(1)
  jours: number;
}
