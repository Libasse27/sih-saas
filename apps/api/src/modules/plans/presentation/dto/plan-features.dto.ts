import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PlanFeaturesDto {
  @ApiProperty()
  @IsBoolean()
  supportPrioritaire: boolean;

  @ApiProperty()
  @IsBoolean()
  apiAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  multiSites: boolean;
}
