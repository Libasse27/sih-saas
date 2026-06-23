import { ApiProperty } from '@nestjs/swagger';
import { NiveauTriage } from '@sih-saas/shared';
import { IsEnum, IsString, IsUUID } from 'class-validator';

export class CreateUrgenceDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  motif: string;

  @ApiProperty({ enum: NiveauTriage })
  @IsEnum(NiveauTriage)
  niveauTriage: NiveauTriage;
}
