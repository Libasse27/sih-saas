import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtablissementStatut } from '@sih-saas/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';

export class FindEtablissementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EtablissementStatut })
  @IsOptional()
  @IsEnum(EtablissementStatut)
  statut?: EtablissementStatut;
}
