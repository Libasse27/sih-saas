import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CouponsService } from './application/coupons.service';
import { CouponEntity } from './infrastructure/entities/coupon.entity';
import { CouponsController } from './presentation/coupons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CouponEntity]), AuditModule],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
