import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AjouterObservationDto {
  @ApiProperty()
  @IsString()
  contenu: string;

  @ApiProperty({ example: 'consultation' })
  @IsString()
  type: string;
}
