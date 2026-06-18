import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatut } from '@sih-saas/shared';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionStatut })
  @IsOptional()
  @IsEnum(SubscriptionStatut)
  statut?: SubscriptionStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  renouvellementAuto?: boolean;
}
