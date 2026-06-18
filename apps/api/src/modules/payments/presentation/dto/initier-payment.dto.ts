import { ApiProperty } from '@nestjs/swagger';
import { Periodicite } from '@sih-saas/shared';
import { IsEnum, IsUUID } from 'class-validator';

export class InitierPaymentDto {
  @ApiProperty()
  @IsUUID()
  etablissementId: string;

  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: Periodicite })
  @IsEnum(Periodicite)
  periodicite: Periodicite;
}
