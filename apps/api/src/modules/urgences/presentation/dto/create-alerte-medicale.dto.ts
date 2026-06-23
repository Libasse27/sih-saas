import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateAlerteMedicaleDto {
  @ApiProperty({ example: 'DETRESSE_VITALE' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  message: string;
}
