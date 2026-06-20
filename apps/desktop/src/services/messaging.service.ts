import type { ApiResponse, Scope } from '@sih-saas/shared';
import type { Paginated } from '../types/api';
import { api } from './api';

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

export async function findMessages(conversationId: string, page: number, limit: number): Promise<Paginated<Message>> {
  const response = await api.get<ApiResponse<Paginated<Message>>>(`/conversations/${conversationId}/messages`, {
    params: { page, limit },
  });
  return response.data.data;
}

export async function envoyerMessage(conversationId: string, contenu: string): Promise<Message> {
  const response = await api.post<ApiResponse<Message>>(`/conversations/${conversationId}/messages`, { contenu });
  return response.data.data;
}
