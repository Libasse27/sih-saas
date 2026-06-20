import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';

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
