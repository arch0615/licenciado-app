import type { ApiClient } from "@/services/api/types";

/** Live `GET /v1/dashboards/licenciado-central/{id}` (portal /inicio). Values are rendered as received. */
export type DashboardAlert = {
  id: string;
  type: "DOCUMENTO_PENDENTE" | "UC_AGUARDANDO_ATIVACAO" | "PAGAMENTO_PENDENTE" | string;
  description: string;
  entityId: string | null;
  entityType: "CLIENTE" | "UC" | "PAGAMENTO" | string | null;
  metadata?: { clienteId?: string | null; tab?: string | null; documentoId?: string | null } | null;
  read_at: string | null;
  resolved_at: string | null;
};

export type MonthPoint = { month: string; value: number };

export type Dashboard = {
  licenciado?: { id: string; nome_completo: string | null; status: string } | null;
  summary: {
    total_clientes: number | null;
    clientes_ativos: number | null;
    ucs_em_ativacao: number | null;
    comissao_prevista_mes: number | null;
    comissao_a_receber?: { licenciado?: number | null; sublicenciados?: number | null; total?: number | null } | null;
    competencia_atual?: string | null;
    regiao?: string | null;
    kwh_disponivel_regiao?: number | null;
  };
  charts?: { clientes_por_mes?: MonthPoint[]; comissoes_por_mes?: MonthPoint[] } | null;
  alerts: DashboardAlert[];
};

/**
 * The legacy path carries the licenciado id. The id used is the one returned by GET /v1/auth/me / the
 * business record (server-resolved) — never a locally stored value — and the backend verifies it.
 */
export function getDashboard(api: ApiClient, licenciadoId: string): Promise<Dashboard> {
  return api.get<Dashboard>(`/v1/dashboards/licenciado-central/${encodeURIComponent(licenciadoId)}`);
}

/** Portal "Marcar como lido" on an operational alert (normal user action). */
export function markDashboardAlertRead(api: ApiClient, licenciadoId: string, alertId: string): Promise<unknown> {
  return api.post(`/v1/dashboards/licenciado-central/${encodeURIComponent(licenciadoId)}/alerts/${encodeURIComponent(alertId)}/read`);
}

/** Portal "Resolver" on an operational alert (normal user action). */
export function resolveDashboardAlert(api: ApiClient, licenciadoId: string, alertId: string): Promise<unknown> {
  return api.post(`/v1/dashboards/licenciado-central/${encodeURIComponent(licenciadoId)}/alerts/${encodeURIComponent(alertId)}/resolve`);
}
