import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/** -1 = illimité. */
export class PlanLimitesDto {
  @ApiProperty({ description: '-1 = illimité' })
  @IsInt()
  @Min(-1)
  maxUtilisateurs: number;

  @ApiProperty({ description: '-1 = illimité' })
  @IsInt()
  @Min(-1)
  maxLits: number;

  @ApiProperty({ description: '-1 = illimité' })
  @IsInt()
  @Min(-1)
  maxStockageMo: number;
}
