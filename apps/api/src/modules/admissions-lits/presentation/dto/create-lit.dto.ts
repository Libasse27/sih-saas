import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateLitDto {
  @ApiProperty()
  @IsUUID()
  chambreId: string;

  @ApiProperty()
  @IsString()
  numero: string;
}
