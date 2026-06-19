/**
 * Forme RÉELLE des réponses paginées (vérifiée dans apps/api/src/shared/interceptors/response.interceptor.ts) :
 * `data` contient directement { items, page, limit, total, totalPages }. Le type `PaginatedApiResponse`
 * de @sih-saas/shared n'est pas câblé ainsi côté backend — ne pas s'y fier.
 */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
