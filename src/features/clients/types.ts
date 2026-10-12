/**
 * Client (consumidor) contracts from backend-api-inventory.md §10–11 (legacy business service).
 * NOT in the licenciado-api Swagger — unverified until the business API publishes its OpenAPI.
 */
export type ClientStatus = "APROVADO" | "INATIVO" | "PENDENTE_APROVACAO";

export type Client = {
  id: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  nome_completo: string | null;
  razao_social: string | null;
  documento: string | null;
  cpf: string | null;
  cnpj: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  status: ClientStatus | string;
  created_at: string;
  cadastrado_por?: string | null;
  sublicenciado_id?: string | null;
  total_ucs_vinculadas?: number | null;
};

/**
 * `vinculos_uc` item. The live API returns only `{ id, consumidor_id, uc_id, ativo, data_inicio, data_fim }`,
 * where `uc_id` is an internal UUID (not the UC number). `uc_numero` / `numero` / nested `uc` are optional
 * (legacy contract). Use `ucLinkLabel()`.
 */
export type ClientUcLink = {
  id: string;
  uc_id?: string | null;
  uc_numero?: string | null;
  numero?: string | null;
  ativo: boolean;
  uc?: { concessionaria: string | null; cidade: string | null; uf: string | null } | null;
};

export type ClientDetail = Client & {
  vinculos_uc?: ClientUcLink[];
  aprovado_em?: string | null;
};

export type ClientFilters = {
  /** Free text: name, or exact CPF (11 digits) / CNPJ (14 digits). */
  search?: string;
  status?: ClientStatus;
  cidade?: string;
  uf?: string;
};


export type JourneyStepState = "DONE" | "CURRENT" | "PENDING" | "BLOCKED" | "SKIPPED";
export type JourneyStep = { key: string; label: string; state: JourneyStepState; date?: string | null; detail?: string | null };

/** T1/T3 tracking card (camelCase in the backend). */
export type ClientJourneyCard = {
  consumidorId: string;
  clientName: string;
  clientType: "PF" | "PJ";
  clientStatus: string;
  cidade: string | null;
  uf: string | null;
  isCompensating: boolean;
  hasDocumentPending: boolean;
  hasInvoiceOverdue: boolean;
  metrics: { totalUcs: number; totalUcsAtivas: number; totalUcsCompensando: number; totalInvoicesOverdue: number };
  /** Live: `{ ucId, ucNumber, statusUc, compensando }`; `ucId` matches `vinculos_uc[].uc_id`. */
  ucsPreview?: { ucId?: string | null; ucNumber?: string | null; statusUc?: string | null; compensando?: boolean | null }[];
  badges: string[];
  lastActionLabel: string | null;
  lastActionAt: string | null;
  nextRecommendedActionLabel: string | null;
  journeyStage?: string | null;
  journeyStageOrder?: number | null;
  clientJourney?: JourneyStep[];
  journeySubStatus?: string | null;
  /** Live T3 extras shown by the portal journey modal. */
  invoices?: { invoiceId?: string | null; ucId?: string | null; competency?: string | null; status?: string | null; dueAt?: string | null; totalValue?: number | null }[];
  geradorInterest?: { hasOpenRequest?: boolean | null; requestStatus?: string | null } | null;
  solicitacoesUc?: {
    id: string;
    numeroUc?: string | null;
    concessionaria?: string | null;
    status?: string | null;
    motivoReprovacao?: string | null;
    contrato?: { status?: string | null; signingUrl?: string | null } | null;
  }[];
};

/** T4 pending action (snake_case in the backend). */
export type ClientAlert = {
  id: string;
  tipo: "DOCUMENTO_PENDENTE" | "DOCUMENTO_REPROVADO" | "UC_AGUARDANDO_ATIVACAO" | "FATURA_VENCIDA" | "SEM_COMPENSACAO" | string;
  severidade: "INFO" | "WARNING" | "CRITICAL";
  titulo: string;
  descricao: string;
  consumidor_id: string;
  uc_id?: string | null;
  created_at: string;
  recommended_action_label: string | null;
};
