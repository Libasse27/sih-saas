import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { LogistiqueService } from './application/logistique.service';
import { ArticleStockEntity } from './infrastructure/entities/article-stock.entity';
import { LogistiqueController } from './presentation/logistique.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleStockEntity]), AuditModule],
  controllers: [LogistiqueController],
  providers: [LogistiqueService],
  exports: [LogistiqueService],
})
export class LogistiqueModule {}
