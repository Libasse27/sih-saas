import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SterilisationService } from './application/sterilisation.service';
import { CycleSterilisationEntity } from './infrastructure/entities/cycle-sterilisation.entity';
import { SterilisationController } from './presentation/sterilisation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CycleSterilisationEntity]), AuditModule],
  controllers: [SterilisationController],
  providers: [SterilisationService],
  exports: [SterilisationService],
})
export class SterilisationModule {}
