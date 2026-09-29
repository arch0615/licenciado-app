import { onlyDigits } from "@/lib/format";
import { toPage, type Page } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

import type {
  Client,
  ClientAlert,
  ClientDetail,
  ClientFilters,
  ClientJourneyCard,
  CreateClientInput
} from "./types";

export const CLIENTS_PAGE_SIZE = 20;

/**
 * Clients (inventory C1/C3/C12, T1/T3/T4 — business service, not in Swagger).
 * Scope comes from the token: `licenciado_id` / `user_id` are never sent.
 */
export async function listClients(api: ApiClient, filters: ClientFilters, page: number): Promise<Page<Client>> {
  const search = filters.search?.trim() ?? "";
  const digits = onlyDigits(search);
  const byCpf = digits.length === 11 && digits === search.replace(/[.\-\s]/g, "");
  const byCnpj = digits.length === 14 && digits === search.replace(/[./\-\s]/g, "");
  const body = await api.get<unknown>("/v1/consumidores", {
    query: {
      nome: byCpf || byCnpj ? undefined : search,
      cpf: byCpf ? digits : undefined,
      cnpj: byCnpj ? digits : undefined,
      status: filters.status,
      cidade: filters.cidade,
      uf: filters.uf,
      page,
      perPage: CLIENTS_PAGE_SIZE
    }
  });
  return toPage<Client>(body, { page, pageSize: CLIENTS_PAGE_SIZE });
}

export function getClient(api: ApiClient, clientId: string): Promise<ClientDetail> {
  return api.get<ClientDetail>(`/v1/consumidores/${encodeURIComponent(clientId)}`);
}

export function createClient(api: ApiClient, input: CreateClientInput, idempotencyKey: string): Promise<{ id: string }> {
  return api.post<{ id: string }>(
    "/v1/consumidores",
    {
      ...input,
      cpf: input.cpf ? onlyDigits(input.cpf) : undefined,
      cnpj: input.cnpj ? onlyDigits(input.cnpj) : undefined,
      telefone: onlyDigits(input.telefone),
      celular: onlyDigits(input.celular ?? input.telefone)
    },
    { idempotencyKey }
  );
}

export function getClientJourney(api: ApiClient, clientId: string): Promise<ClientJourneyCard> {
  return api.get<ClientJourneyCard>(`/v1/acompanhamento/${encodeURIComponent(clientId)}`);
}

export async function listJourneyCards(api: ApiClient, query: string): Promise<ClientJourneyCard[]> {
  const body = await api.get<unknown>("/v1/acompanhamento/cards", { query: { query, page: 1, perPage: 100 } });
  return toPage<ClientJourneyCard>(body).items;
}

export async function listPendingActions(api: ApiClient): Promise<ClientAlert[]> {
  const body = await api.get<unknown>("/v1/acompanhamento/alertas");
  return toPage<ClientAlert>(body).items;
}
