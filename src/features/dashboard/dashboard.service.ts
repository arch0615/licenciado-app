import type { ApiClient } from "@/services/api/types";

/** Inventory B23 (business service, not in Swagger). */
export type Dashboard = {
  summary: {
    total_clientes: number | null;
    clientes_ativos: number | null;
    ucs_em_ativacao: number | null;
    comissao_prevista_mes: number | null;
  };
  alerts: {
    id: string;
    type: string;
    description: string;
    entityId: string | null;
    entityType: "CLIENTE" | "UC" | "PAGAMENTO" | null;
    read_at: string | null;
    resolved_at: string | null;
  }[];
};

/**
 * The legacy path carries the licenciado id. The id used is the one returned by GET /v1/auth/me
 * (server-resolved) — never a locally stored value — and the backend must verify it against the token.
 */
export function getDashboard(api: ApiClient, licenciadoId: string): Promise<Dashboard> {
  return api.get<Dashboard>(`/v1/dashboards/licenciado-central/${encodeURIComponent(licenciadoId)}`);
}
