import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class PlanTarifsDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  mensuel: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  annuel: number;

  @ApiProperty({ default: 'XOF' })
  @IsString()
  devise: string;
}
