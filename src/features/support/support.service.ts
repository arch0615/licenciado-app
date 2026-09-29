import { toPage, type Page } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/** Inventory SP1–SP6 (business service, camelCase, not in Swagger). */
export type TicketCategory = "MINHA_FATURA" | "PAGAMENTO" | "ECONOMIA" | "PONTOS_MARKETPLACE" | "CADASTRO_DOCUMENTOS";
export type TicketStatus = "AGUARDANDO" | "EM_ATENDIMENTO" | "RESOLVIDO";

export type SupportTicket = {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: TicketCategory;
  status: TicketStatus;
  subject?: string | null;
  clientId?: string | null;
  lastMessagePreview?: string | null;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  sentAt: string;
  sender: "USER" | "AGENT" | "BOT";
  text: string;
  attachments?: { id: string; name: string; url?: string | null; mimeType: string; sizeBytes: number }[];
};

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "CADASTRO_DOCUMENTOS", label: "Cadastro e documentos" },
  { value: "PAGAMENTO", label: "Pagamentos e comissões" },
  { value: "MINHA_FATURA", label: "Fatura" },
  { value: "ECONOMIA", label: "Economia" },
  { value: "PONTOS_MARKETPLACE", label: "Pontos e marketplace" }
];

export async function listTickets(api: ApiClient, status: TicketStatus | undefined, page: number): Promise<Page<SupportTicket>> {
  const body = await api.get<unknown>("/v1/support/tickets", { query: { status, page, pageSize: 20 } });
  return toPage<SupportTicket>(body, { page, pageSize: 20 });
}

export function getTicket(api: ApiClient, id: string): Promise<SupportTicket | null> {
  return api.get<SupportTicket | null>(`/v1/support/tickets/${encodeURIComponent(id)}`);
}

export async function listTicketMessages(api: ApiClient, id: string): Promise<SupportMessage[]> {
  return toPage<SupportMessage>(await api.get<unknown>(`/v1/support/tickets/${encodeURIComponent(id)}/messages`)).items;
}

export function createTicket(
  api: ApiClient,
  input: { category: TicketCategory; subject?: string; initialMessage?: string; clientId?: string },
  idempotencyKey: string
): Promise<SupportTicket> {
  return api.post<SupportTicket>("/v1/support/tickets", input, { idempotencyKey });
}

/**
 * Text messages only. The backend has no attachment upload (inventory §16 MISSING), and sending
 * attachment metadata without the file would be misleading — so the app does not offer attachments yet.
 */
export function sendTicketMessage(api: ApiClient, id: string, text: string, idempotencyKey: string): Promise<SupportMessage> {
  return api.post<SupportMessage>(`/v1/support/tickets/${encodeURIComponent(id)}/messages`, { text }, { idempotencyKey });
}

export function resolveTicket(api: ApiClient, id: string): Promise<SupportTicket> {
  return api.patch<SupportTicket>(`/v1/support/tickets/${encodeURIComponent(id)}/status`, { status: "RESOLVIDO" });
}
