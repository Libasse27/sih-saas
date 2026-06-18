import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreatePrescriptionLigneDto {
  @ApiProperty()
  @IsUUID()
  medicamentId: string;

  @ApiProperty({ example: '1 comprimé matin et soir' })
  @IsString()
  posologie: string;

  @ApiProperty({ example: '7 jours' })
  @IsString()
  duree: string;

  @ApiProperty({ example: 'orale' })
  @IsString()
  voie: string;
}
