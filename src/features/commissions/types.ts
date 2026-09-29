/**
 * Commission & payment contracts from backend-api-inventory.md §12 (legacy business service,
 * not in the licenciado-api Swagger). All amounts are rendered as received — never computed.
 */
export type CommissionStats = {
  total_valor: number;
  /** Present only for representatives (their own share). */
  total_valor_sublicenciado?: number;
  total_comissoes: number;
  por_status: { status: string; valor_total: number; valor_total_sublicenciado?: number | null }[];
  por_competencia: { competencia: string; valor_total: number; valor_total_sublicenciado?: number | null }[];
  /** Authoritative summary fields requested from the backend (inventory M-C1); shown only when sent. */
  previsto_mes_atual?: number | null;
  a_receber?: number | null;
  pago_ultimos_12_meses?: number | null;
};

export type Commission = {
  id: string;
  consumidor_id: string | null;
  competencia: string;
  /** Licenciado share — the backend omits it for representatives. */
  valor_comissao?: number | null;
  valor_comissao_sublicenciado?: number | null;
  status: string;
  tipo: string;
  consumidor_nome: string | null;
  sublicenciado_nome: string | null;
  fatura_id: string | null;
  data_geracao: string | null;
  data_pagamento: string | null;
  regra_aplicada?: { elegivel?: boolean; motivo?: string | null; [key: string]: unknown } | null;
};

export type CommissionFilters = { competencia?: string; status?: string };

export type Payment = {
  id: string;
  lote_id: string | null;
  valor_comissoes: number | null;
  valor_liquido: number | null;
  status: string;
  motivo_falha: string | null;
  created_at: string;
  pago_em: string | null;
  competencias: string[];
  tem_comprovante?: boolean;
};

export type PaymentStatement = {
  pagamento: {
    id: string;
    status: string;
    metodo: string | null;
    competencias: string[];
    valor_total_pago: number | null;
    valor_liquido: number | null;
    created_at: string;
    pago_em: string | null;
  };
  totais: {
    quantidade_comissoes: number;
    quantidade_clientes: number;
    valor_total_pago: number | null;
    valor_parte_licenciado: number | null;
    valor_repasses_sublicenciados: number | null;
  };
  itens: {
    comissao_id: string;
    competencia: string;
    consumidor_nome: string | null;
    sublicenciado_nome: string | null;
    valor_parte_licenciado: number | null;
    valor_repassado_sublicenciado: number | null;
    valor_total_comissao: number | null;
    status: string;
  }[];
};
