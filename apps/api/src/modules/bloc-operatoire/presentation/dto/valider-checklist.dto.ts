import { ApiProperty } from '@nestjs/swagger';
import { PhaseChecklistOms } from '@sih-saas/shared';
import { IsEnum } from 'class-validator';

export class ValiderChecklistDto {
  @ApiProperty({ enum: PhaseChecklistOms })
  @IsEnum(PhaseChecklistOms)
  phase: PhaseChecklistOms;
}
