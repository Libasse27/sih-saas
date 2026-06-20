import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Periodicite } from '@sih-saas/shared';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: Periodicite })
  @IsEnum(Periodicite)
  periodicite: Periodicite;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  renouvellementAuto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponApplique?: string;

  /** Montant déjà remisé (coupon validé en amont par PaymentsService) — sinon calculerMontant() fait foi. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  montantOverride?: number;
}
