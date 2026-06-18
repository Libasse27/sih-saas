import { ApiProperty } from '@nestjs/swagger';
import { ModePaiementPatient } from '@sih-saas/shared';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class CreatePaiementPatientDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  montant: number;

  @ApiProperty({ enum: ModePaiementPatient })
  @IsEnum(ModePaiementPatient)
  mode: ModePaiementPatient;
}
