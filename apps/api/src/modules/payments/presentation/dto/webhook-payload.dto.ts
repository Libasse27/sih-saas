import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class WebhookPayloadDto {
  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty({ enum: ['REUSSI', 'ECHOUE'] })
  @IsIn(['REUSSI', 'ECHOUE'])
  statut: 'REUSSI' | 'ECHOUE';
}
