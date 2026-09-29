import { toPage, type Page } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

import type { Commission, CommissionFilters, CommissionStats, Payment, PaymentStatement } from "./types";

export const COMMISSIONS_PAGE_SIZE = 50;

/**
 * Commissions (inventory M-C1…M-C5 — business service, not in Swagger).
 * `licenciado_id` is never sent: the backend scopes by token (and hides the licenciado share from
 * representatives). No value is derived here; screens show backend numbers only.
 */
export function getCommissionSummary(api: ApiClient): Promise<CommissionStats> {
  return api.get<CommissionStats>("/v1/comissoes/stats");
}

export async function listCommissions(api: ApiClient, filters: CommissionFilters, page: number): Promise<Page<Commission>> {
  const body = await api.get<unknown>("/v1/comissoes", {
    query: { competencia: filters.competencia, status: filters.status, page, perPage: COMMISSIONS_PAGE_SIZE }
  });
  return toPage<Commission>(body, { page, pageSize: COMMISSIONS_PAGE_SIZE });
}

export function getCommission(api: ApiClient, id: string): Promise<Commission> {
  return api.get<Commission>(`/v1/comissoes/${encodeURIComponent(id)}`);
}

/** Licenciado only (the backend returns 403 to representatives). */
export async function listPayments(api: ApiClient, page: number): Promise<Page<Payment>> {
  const body = await api.get<unknown>("/v1/pagamentos-licenciados", { query: { page, per_page: COMMISSIONS_PAGE_SIZE } });
  return toPage<Payment>(body, { page, pageSize: COMMISSIONS_PAGE_SIZE });
}

export function getPaymentStatement(api: ApiClient, paymentId: string): Promise<PaymentStatement> {
  return api.get<PaymentStatement>(`/v1/pagamentos-licenciados/${encodeURIComponent(paymentId)}/extrato`);
}
