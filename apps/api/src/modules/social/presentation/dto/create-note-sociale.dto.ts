import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateNoteSocialeDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  contenu: string;
}
