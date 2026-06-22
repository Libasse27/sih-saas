import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateSeanceReadaptationDto {
  @ApiProperty({ example: 'Kinésithérapie post-opératoire' })
  @IsString()
  typeSeance: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  dureeMinutes: number;

  @ApiProperty()
  @IsString()
  observations: string;
}
