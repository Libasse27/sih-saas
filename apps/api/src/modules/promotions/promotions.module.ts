import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PromotionsService } from './application/promotions.service';
import { PromotionEntity } from './infrastructure/entities/promotion.entity';
import { PromotionsController } from './presentation/promotions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PromotionEntity]), AuditModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
