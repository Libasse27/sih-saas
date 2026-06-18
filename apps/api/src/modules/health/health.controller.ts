import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { Public } from '../../shared/decorators/public.decorator';
import { ResponseMessage } from '../../shared/decorators/response-message.decorator';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Public()
  @Get()
  @ResponseMessage('État de santé de l’API.')
  check() {
    return {
      postgres: this.dataSource.isInitialized ? 'up' : 'down',
      mongodb: this.mongoConnection.readyState === 1 ? 'up' : 'down',
    };
  }
}
