import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicamentCatalogueEntity } from '../infrastructure/entities/medicament-catalogue.entity';
import { CreateMedicamentCatalogueDto } from '../presentation/dto/create-medicament-catalogue.dto';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * `clinic.medicaments_catalogue` n'a NI `etablissementId` NI RLS (référentiel global, non tenant —
 * modele-de-donnees.md §2) : repository injecté directement, jamais via tenantContext.getManager().
 * Visible et modifiable par tout établissement disposant de `stock:manage` — partagé comme un
 * formulaire pharmaceutique national.
 */
@Injectable()
export class MedicamentsCatalogueService {
  constructor(
    @InjectRepository(MedicamentCatalogueEntity) private readonly repository: Repository<MedicamentCatalogueEntity>,
  ) {}

  async create(dto: CreateMedicamentCatalogueDto): Promise<MedicamentCatalogueEntity> {
    return this.repository.save(this.repository.create({ ...dto, codeAtc: dto.codeAtc ?? null }));
  }

  async findAll(page: number, limit: number, recherche?: string): Promise<PaginatedResult<MedicamentCatalogueEntity>> {
    const [items, total] = await this.repository.findAndCount({
      where: recherche ? { dci: recherche } : {},
      skip: (page - 1) * limit,
      take: limit,
      order: { dci: 'ASC' },
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<MedicamentCatalogueEntity> {
    const medicament = await this.repository.findOne({ where: { id } });
    if (!medicament) {
      throw new NotFoundException('Médicament introuvable dans le catalogue.');
    }
    return medicament;
  }
}
