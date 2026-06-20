import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  contenu: string;
}
