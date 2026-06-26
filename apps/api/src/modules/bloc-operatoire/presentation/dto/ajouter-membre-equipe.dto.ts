import { ApiProperty } from '@nestjs/swagger';
import { RoleEquipeOperatoire } from '@sih-saas/shared';
import { IsEnum, IsUUID } from 'class-validator';

export class AjouterMembreEquipeDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: RoleEquipeOperatoire })
  @IsEnum(RoleEquipeOperatoire)
  role: RoleEquipeOperatoire;
}
