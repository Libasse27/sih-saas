import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './application/plans.service';
import { PlanEntity } from './infrastructure/entities/plan.entity';
import { PlansController } from './presentation/plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
