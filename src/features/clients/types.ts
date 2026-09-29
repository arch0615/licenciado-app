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

export type ClientUcLink = {
  id: string;
  uc_numero: string;
  ativo: boolean;
  uc: { concessionaria: string | null; cidade: string | null; uf: string | null } | null;
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

/** C3 body. Tenant, owner and user ids are never sent: the backend derives them from the token. */
export type CreateClientInput = {
  tipo_pessoa: "FISICA" | "JURIDICA";
  nome_completo: string;
  razao_social?: string;
  cpf?: string;
  cnpj?: string;
  email: string;
  telefone: string;
  celular?: string;
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
  badges: string[];
  lastActionLabel: string | null;
  lastActionAt: string | null;
  nextRecommendedActionLabel: string | null;
  journeyStage?: string | null;
  journeyStageOrder?: number | null;
  clientJourney?: JourneyStep[];
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
