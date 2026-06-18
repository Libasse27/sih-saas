import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Periodicite } from '@sih-saas/shared';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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
}
