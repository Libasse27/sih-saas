import { Module } from '@nestjs/common';
import { ComptabiliteService } from './application/comptabilite.service';

@Module({
  providers: [ComptabiliteService],
  exports: [ComptabiliteService],
})
export class ComptabiliteModule {}
