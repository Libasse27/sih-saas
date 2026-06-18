// Format de réponse API imposé par CLAUDE.md (racine globale) : { success, data, message, errors? }
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  errors?: unknown[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}
