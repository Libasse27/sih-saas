import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransfertAdmissionDto {
  @ApiProperty({ description: 'Lit destination, libre, dans le même établissement.' })
  @IsUUID()
  litDestinationId: string;
}
