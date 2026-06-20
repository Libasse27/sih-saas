import type { ApiResponse, Scope } from '@sih-saas/shared';
import { api } from './client';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Conversation {
  id: string;
  patientId: string;
  praticienId: string;
  praticienNom: string;
  patientNom: string;
  dernierMessageAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  auteurId: string;
  auteurScope: Scope;
  contenu: string;
  createdAt: string;
}

export async function findConversations(): Promise<Conversation[]> {
  const response = await api.get<ApiResponse<Conversation[]>>('/conversations');
  return response.data.data;
}

export async function demarrerConversation(praticienId: string): Promise<Conversation> {
  const response = await api.post<ApiResponse<Conversation>>('/conversations', { praticienId });
  return response.data.data;
}

export async function findMessages(conversationId: string, page: number, limit: number): Promise<PaginatedResult<Message>> {
  const response = await api.get<ApiResponse<PaginatedResult<Message>>>(`/conversations/${conversationId}/messages`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function envoyerMessage(conversationId: string, contenu: string): Promise<Message> {
  const response = await api.post<ApiResponse<Message>>(`/conversations/${conversationId}/messages`, { contenu });
  return response.data.data;
}
