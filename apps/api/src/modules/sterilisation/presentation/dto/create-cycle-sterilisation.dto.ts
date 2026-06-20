import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCycleSterilisationDto {
  @ApiProperty()
  @IsString()
  materiel: string;

  @ApiProperty()
  @IsString()
  numeroLot: string;
}
