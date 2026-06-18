import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ContactUrgenceDto {
  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty({ description: 'Format +221XXXXXXXXX' })
  @IsString()
  telephone: string;

  @ApiProperty()
  @IsString()
  relation: string;
}
