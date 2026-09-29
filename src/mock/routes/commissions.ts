import type { Commission, CommissionStats, Payment, PaymentStatement } from "@/features/commissions/types";
import { ApiError } from "@/services/api/errors";
import type { MockRoute } from "@/services/api/mock-transport";

import { requireApproved, requireRole } from "./account";

/**
 * Fixed sample values (as a backend would return them). The app never derives totals, so the
 * mock carries its own precomputed figures, like the real service.
 */
const MONTHS = ["2026-08", "2026-07", "2026-06"];
const STATUSES = ["PAGA", "APROVADA", "GERADA"];
const CLIENTS = ["Ana Souza", "Bruno Lima", "Mercado Bom Preço ME", "Eduarda Alves"];

const commissions: Commission[] = MONTHS.flatMap((competencia, monthIndex) =>
  CLIENTS.map((client, clientIndex) => ({
    id: `com-${monthIndex}-${clientIndex}`,
    consumidor_id: `cli-${clientIndex + 1}`,
    competencia,
    valor_comissao: 42.5 + clientIndex * 10,
    valor_comissao_sublicenciado: clientIndex % 2 === 0 ? 12.75 : null,
    status: STATUSES[monthIndex]!,
    tipo: "GERADA",
    consumidor_nome: client,
    sublicenciado_nome: clientIndex % 2 === 0 ? "João Representante" : null,
    fatura_id: `fat-${monthIndex}${clientIndex}`,
    data_geracao: `${competencia}-10T12:00:00.000Z`,
    data_pagamento: monthIndex === 0 ? `${competencia}-25T12:00:00.000Z` : null,
    regra_aplicada: { elegivel: true, motivo: "Cliente compensando e fatura paga no mês." }
  }))
);

const licenciadoStats: CommissionStats = {
  total_valor: 750,
  total_comissoes: commissions.length,
  por_status: [
    { status: "PAGA", valor_total: 250 },
    { status: "APROVADA", valor_total: 250 },
    { status: "GERADA", valor_total: 250 }
  ],
  por_competencia: MONTHS.map((competencia) => ({ competencia, valor_total: 250 })),
  a_receber: 250,
  previsto_mes_atual: 250,
  pago_ultimos_12_meses: 250
};

const sublicenciadoStats: CommissionStats = {
  total_valor: 0,
  total_valor_sublicenciado: 76.5,
  total_comissoes: 6,
  por_status: [
    { status: "PAGA", valor_total: 0, valor_total_sublicenciado: 25.5 },
    { status: "APROVADA", valor_total: 0, valor_total_sublicenciado: 25.5 },
    { status: "GERADA", valor_total: 0, valor_total_sublicenciado: 25.5 }
  ],
  por_competencia: MONTHS.map((competencia) => ({ competencia, valor_total: 0, valor_total_sublicenciado: 25.5 }))
};

const payments: Payment[] = [
  {
    id: "pag-1",
    lote_id: "lote-8",
    valor_comissoes: 250,
    valor_liquido: 224.5,
    status: "PAGO",
    motivo_falha: null,
    created_at: "2026-08-20T12:00:00.000Z",
    pago_em: "2026-08-25T12:00:00.000Z",
    competencias: ["2026-08"],
    tem_comprovante: true
  }
];

const statement: PaymentStatement = {
  pagamento: {
    id: "pag-1",
    status: "PAGO",
    metodo: "PIX",
    competencias: ["2026-08"],
    valor_total_pago: 250,
    valor_liquido: 224.5,
    created_at: "2026-08-20T12:00:00.000Z",
    pago_em: "2026-08-25T12:00:00.000Z"
  },
  totais: {
    quantidade_comissoes: 4,
    quantidade_clientes: 4,
    valor_total_pago: 250,
    valor_parte_licenciado: 224.5,
    valor_repasses_sublicenciados: 25.5
  },
  itens: commissions
    .filter((item) => item.competencia === "2026-08")
    .map((item) => ({
      comissao_id: item.id,
      competencia: item.competencia,
      consumidor_nome: item.consumidor_nome,
      sublicenciado_nome: item.sublicenciado_nome,
      valor_parte_licenciado: item.valor_comissao ?? null,
      valor_repassado_sublicenciado: item.valor_comissao_sublicenciado ?? null,
      valor_total_comissao: 62.5,
      status: item.status
    }))
};

/** Representatives only receive their own share: the licenciado share is omitted (inventory M-C2). */
function forViewer(item: Commission): Commission {
  const me = requireApproved();
  if (me.tipoUsuarioResolvido !== "SUBLICENCIADO") return item;
  const { valor_comissao: _hidden, ...rest } = item;
  return rest;
}

export const commissionRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/v1/comissoes/stats",
    handler: () => (requireApproved().tipoUsuarioResolvido === "SUBLICENCIADO" ? sublicenciadoStats : licenciadoStats)
  },
  {
    method: "GET",
    path: "/v1/comissoes",
    handler: ({ request }) => {
      const me = requireApproved();
      const competencia = request.query?.competencia ? String(request.query.competencia) : null;
      const visible = commissions
        .filter((item) => me.tipoUsuarioResolvido === "LICENCIADO" || item.sublicenciado_nome)
        .filter((item) => !competencia || item.competencia === competencia)
        .map(forViewer);
      return { data: visible, meta: { total: visible.length, page: 1, perPage: 50 } };
    }
  },
  {
    method: "GET",
    path: "/v1/comissoes/:id",
    handler: ({ params }) => {
      const item = commissions.find((commission) => commission.id === params.id);
      if (!item) throw new ApiError({ status: 404, code: "COMISSAO_NAO_ENCONTRADA", message: "Comissão não encontrada." });
      return forViewer(item);
    }
  },
  {
    method: "GET",
    path: "/v1/pagamentos-licenciados",
    handler: () => (requireRole("LICENCIADO"), requireApproved(), { data: payments })
  },
  {
    method: "GET",
    path: "/v1/pagamentos-licenciados/:id/extrato",
    handler: () => (requireRole("LICENCIADO"), requireApproved(), statement)
  }
];
