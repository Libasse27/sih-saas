import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateAffectationDto {
  @ApiPropertyOptional({ description: 'Service principal d’affectation, ou null pour retirer toute affectation.' })
  @IsOptional()
  @IsUUID()
  serviceId?: string | null;
}
