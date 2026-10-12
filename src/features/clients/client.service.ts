import { onlyDigits } from "@/lib/format";
import { toPage, type Page } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

import type {
  Client,
  ClientAlert,
  ClientUcLink,
  ClientDetail,
  ClientFilters,
  ClientJourneyCard
} from "./types";

export const CLIENTS_PAGE_SIZE = 20;

/**
 * Clients (C1/C12, T1/T3/T4). As in the portal menu, new clients join through the consumer
 * self-registration link the app shares (the portal /clientes/novo form is not linked from its UI).
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

type UcPreview = NonNullable<ClientJourneyCard["ucsPreview"]>[number];

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Real UC number of a link, never invented: `uc_numero` → `numero` → the journey's `ucsPreview[].ucNumber`
 * whose `ucId` equals the link's `uc_id`. `uc_id` itself is an internal UUID and is never displayed.
 */
export function ucLinkNumber(
  link: Pick<ClientUcLink, "uc_numero" | "numero" | "uc_id">,
  journeyUcs?: readonly UcPreview[] | null
): string | null {
  const direct = text(link.uc_numero) || text(link.numero);
  if (direct) return direct;
  const ucId = text(link.uc_id);
  if (!ucId || !journeyUcs) return null;
  return text(journeyUcs.find((uc) => text(uc.ucId) === ucId)?.ucNumber) || null;
}

/** Display label of a UC link: "UC <number>" when known, otherwise the neutral "Unidade consumidora". */
export function ucLinkLabel(
  link: Pick<ClientUcLink, "uc_numero" | "numero" | "uc_id">,
  journeyUcs?: readonly UcPreview[] | null
): string {
  const numero = ucLinkNumber(link, journeyUcs);
  return numero ? `UC ${numero}` : "Unidade consumidora";
}

/** Distributor name when available (legacy nested `uc`), otherwise null. */
export function ucLinkDistributor(link: Pick<ClientUcLink, "uc">): string | null {
  return link.uc?.concessionaria?.trim() || null;
}

export function getClient(api: ApiClient, clientId: string): Promise<ClientDetail> {
  return api.get<ClientDetail>(`/v1/consumidores/${encodeURIComponent(clientId)}`);
}


export function getClientJourney(api: ApiClient, clientId: string): Promise<ClientJourneyCard> {
  return api.get<ClientJourneyCard>(`/v1/acompanhamento/${encodeURIComponent(clientId)}`);
}

/** Portal /acompanhamento filters (all server-side on the live API). */
export type JourneyFilters = {
  query?: string;
  uf?: string;
  cidade?: string;
  withDocumentPending?: boolean;
  withInvoiceOverdue?: boolean;
  compensating?: boolean;
  journeyStage?: string;
};

export async function listJourneyCards(api: ApiClient, filters: JourneyFilters): Promise<ClientJourneyCard[]> {
  const body = await api.get<unknown>("/v1/acompanhamento/cards", {
    query: {
      query: filters.query,
      uf: filters.uf,
      cidade: filters.cidade,
      withDocumentPending: filters.withDocumentPending ? "true" : undefined,
      withInvoiceOverdue: filters.withInvoiceOverdue ? "true" : undefined,
      compensating: filters.compensating === undefined ? undefined : String(filters.compensating),
      journeyStage: filters.journeyStage,
      page: 1,
      perPage: 100
    }
  });
  return toPage<ClientJourneyCard>(body).items;
}

export async function listPendingActions(api: ApiClient): Promise<ClientAlert[]> {
  const body = await api.get<unknown>("/v1/acompanhamento/alertas");
  return toPage<ClientAlert>(body).items;
}
