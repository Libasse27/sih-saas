import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProviderType } from '@sih-saas/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Seules les passerelles réellement implémentées (PaymentGatewayRegistry) — STRIPE/CARTE existent dans l'enum mais échoueraient à l'usage. */
const PASSERELLES_IMPLEMENTEES = [PaymentProviderType.SANDBOX, PaymentProviderType.WAVE, PaymentProviderType.ORANGE_MONEY];

class SettingEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomExpediteur?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emailExpediteur?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emailSupport?: string | null;
}

class SettingPaiementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  actifs?: boolean;

  @ApiPropertyOptional({ enum: PASSERELLES_IMPLEMENTEES })
  @IsOptional()
  @IsIn(PASSERELLES_IMPLEMENTEES)
  passerelleActive?: PaymentProviderType;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: SettingEmailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettingEmailDto)
  email?: SettingEmailDto;

  @ApiPropertyOptional({ type: SettingPaiementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettingPaiementsDto)
  paiements?: SettingPaiementsDto;
}
