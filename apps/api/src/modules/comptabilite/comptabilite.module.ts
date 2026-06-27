import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComptabiliteService } from './application/comptabilite.service';
import { CompteComptableEntity } from './infrastructure/entities/compte-comptable.entity';
import { EcritureComptableEntity } from './infrastructure/entities/ecriture-comptable.entity';
import { ComptabiliteController } from './presentation/comptabilite.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompteComptableEntity, EcritureComptableEntity]),
  ],
  controllers: [ComptabiliteController],
  providers: [ComptabiliteService],
  exports: [ComptabiliteService],
})
export class ComptabiliteModule {}
