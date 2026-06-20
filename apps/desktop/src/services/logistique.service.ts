import type { ApiResponse } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

export interface ArticleStock {
  id: string;
  etablissementId: string;
  nom: string;
  categorie: string | null;
  quantite: number;
  seuilAlerte: number;
  unite: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleStockDto {
  nom: string;
  categorie?: string;
  quantite: number;
  seuilAlerte: number;
  unite: string;
}

export interface UpdateArticleStockDto {
  quantite?: number;
  seuilAlerte?: number;
  categorie?: string;
}

export async function findAll(page: number, limit: number): Promise<Paginated<ArticleStock>> {
  const response = await api.get<ApiResponse<Paginated<ArticleStock>>>('/articles-stock', { params: { page, limit } });
  return response.data.data;
}

export async function create(dto: CreateArticleStockDto): Promise<ArticleStock> {
  const response = await api.post<ApiResponse<ArticleStock>>('/articles-stock', dto);
  return response.data.data;
}

export async function update(id: string, dto: UpdateArticleStockDto): Promise<ArticleStock> {
  const response = await api.patch<ApiResponse<ArticleStock>>(`/articles-stock/${id}`, dto);
  return response.data.data;
}
