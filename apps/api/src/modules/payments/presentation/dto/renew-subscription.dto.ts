import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Periodicite } from '@sih-saas/shared';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/** Jamais de `etablissementId` ici — résolu depuis le JWT par le contrôleur, jamais fourni par le client (voir EtablissementRenewalController). */
export class RenewSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: Periodicite })
  @IsEnum(Periodicite)
  periodicite: Periodicite;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}
