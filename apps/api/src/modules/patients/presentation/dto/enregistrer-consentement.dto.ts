import { ApiProperty } from '@nestjs/swagger';
import { TypeConsentement } from '@sih-saas/shared';
import { IsBoolean, IsEnum } from 'class-validator';

export class EnregistrerConsentementDto {
  @ApiProperty({ enum: TypeConsentement })
  @IsEnum(TypeConsentement)
  type: TypeConsentement;

  @ApiProperty({ description: 'true = consentement donné, false = refusé/retiré.' })
  @IsBoolean()
  valeur: boolean;
}
