import type { AuthMe } from "@/features/auth/types";
import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

/** Inventory §6–7 OnboardingDto (business service, not in Swagger). */
export type Onboarding = {
  id: string;
  status: string;
  etapa_atual: string | null;
  etapas_concluidas: string[];
  pendencias: string[];
  /** Computed by the backend; displayed as-is. */
  progresso_percentual: number;
  can_submit: boolean;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
  reprovado_motivo?: string | null;
};

export type PersonalDataStep = {
  full_name: string;
  cpf: string;
  rg_number: string;
  rg_state: string;
  birth_date: string;
  phone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type ProfessionalDataStep = {
  licenciado_type: "EMPRESA" | "MEI";
  cnpj: string;
  company_name: string;
  trade_name: string;
  operation_state: string;
  operation_city: string;
};

export type BankDataStep = {
  bank_code: string;
  bank_name: string;
  agencia: string;
  conta: string;
  conta_digito: string;
  tipo_conta: "CORRENTE" | "POUPANCA" | "PAGAMENTO";
  pix_tipo?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";
  pix_chave?: string;
};

type Target = { base: string; start: () => Promise<Onboarding> };

/**
 * Resolves the caller's onboarding resource. The id is the server-resolved one from /v1/auth/me.
 * The terms/contract step (L5e/S3) is intentionally NOT implemented: acceptance must be an explicit
 * user action against a published, versioned document, and no legal-documents endpoint exists yet.
 */
function target(api: ApiClient, me: AuthMe): Target {
  if (me.tipoUsuarioResolvido === "SUBLICENCIADO" && me.sublicenciadoId) {
    const id = me.sublicenciadoId;
    return {
      base: `/v1/onboarding/sublicenciado/${encodeURIComponent(id)}`,
      start: () => api.post<Onboarding>("/v1/onboarding/iniciar-sublicenciado", { sublicenciado_id: id })
    };
  }
  if (me.tipoUsuarioResolvido === "LICENCIADO" && me.licenciadoId) {
    const id = me.licenciadoId;
    return {
      base: `/v1/onboarding/licenciado/${encodeURIComponent(id)}`,
      start: () => api.post<Onboarding>("/v1/onboarding/iniciar", { licenciado_id: id })
    };
  }
  throw new Error("Onboarding requires a business record (bootstrap-me first).");
}

/** Status check: GET; only a 404 (not any error) means "not started". */
export async function getOnboarding(api: ApiClient, me: AuthMe): Promise<Onboarding | null> {
  try {
    return await api.get<Onboarding>(target(api, me).base);
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

export function startOnboarding(api: ApiClient, me: AuthMe): Promise<Onboarding> {
  return target(api, me).start();
}

/** Step persistence — each step is saved on the backend as soon as the user completes it. */
export function savePersonalData(api: ApiClient, me: AuthMe, data: PersonalDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${target(api, me).base}/etapas/dados-pessoais`, data);
}

export function saveProfessionalData(api: ApiClient, me: AuthMe, data: ProfessionalDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${target(api, me).base}/etapas/dados-profissionais`, data);
}

export function saveBankData(api: ApiClient, me: AuthMe, data: BankDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${target(api, me).base}/etapas/dados-bancarios`, data);
}

export function saveDocumentsStep(api: ApiClient, me: AuthMe, documentIds: string[]): Promise<Onboarding> {
  return api.put<Onboarding>(`${target(api, me).base}/etapas/documentos`, { documento_ids: documentIds });
}

/** The backend rejects submission while steps are pending; the app only offers it when `can_submit`. */
export function submitOnboarding(api: ApiClient, me: AuthMe, idempotencyKey: string): Promise<Onboarding> {
  return api.post<Onboarding>(`${target(api, me).base}/submit`, undefined, { idempotencyKey });
}
