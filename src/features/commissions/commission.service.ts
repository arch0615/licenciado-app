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

/**
 * Textual payment receipt (portal "Baixar comprovante": `GET /v1/pagamentos-licenciados/{id}/comprovante`,
 * saved by the portal as recibo-pagamento-{id}.txt). Licenciado only; the backend checks ownership.
 */
export function getPaymentReceipt(api: ApiClient, paymentId: string): Promise<string> {
  return api.get<string>(`/v1/pagamentos-licenciados/${encodeURIComponent(paymentId)}/comprovante`, { responseType: "text" });
}

/** The portal enables "Baixar comprovante" when a receipt file exists or the payment is PAGO. */
export function hasPaymentReceipt(payment: Pick<Payment, "status" | "comprovante_path" | "tem_comprovante">): boolean {
  return payment.tem_comprovante === true || Boolean(payment.comprovante_path) || payment.status === "PAGO";
}

export function getPaymentStatement(api: ApiClient, paymentId: string): Promise<PaymentStatement> {
  return api.get<PaymentStatement>(`/v1/pagamentos-licenciados/${encodeURIComponent(paymentId)}/extrato`);
}

/**
 * Eligibility checklist from the backend's `regra_aplicada` (portal /comissoes/regras and the "Detalhe do
 * lançamento" modal). If the backend sends `elegivel`, it wins; otherwise the portal's rule is applied to the
 * backend flags (boolean eligibility only — no amounts are computed).
 */
export function commissionEligibility(item: Pick<Commission, "regra_aplicada">): {
  /** False when the backend sent no generation criteria (then nothing is shown as failed). */
  available: boolean;
  isCompensating: boolean;
  invoicePaid: boolean;
  customerStatus: string;
  canGenerate: boolean;
} {
  const rule = (item.regra_aplicada ?? {}) as Record<string, unknown>;
  const available = ["consumidor_compensando", "fatura_paga", "status_consumidor", "elegivel"].some(
    (key) => rule[key] !== undefined && rule[key] !== null
  );
  const isCompensating = rule.consumidor_compensando === true;
  const invoicePaid = rule.fatura_paga === true;
  const customerStatus = typeof rule.status_consumidor === "string" ? rule.status_consumidor : "NAO_INFORMADO";
  const canGenerate =
    typeof rule.elegivel === "boolean" ? rule.elegivel : isCompensating && invoicePaid && customerStatus === "ATIVO_COMPENSANDO";
  return { available, isCompensating, invoicePaid, customerStatus, canGenerate };
}
