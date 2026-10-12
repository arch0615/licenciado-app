import type { AuthMe } from "@/features/auth/types";
import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

/**
 * Onboarding (portal /onboarding — licenciado 5-step and representative 6-step wizards).
 * Live ACVEL business API (docs/openapi/acvel-business-live.json). The id is always the server-resolved one
 * from /v1/auth/me or the business record, never a locally stored value.
 */
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

/** Statuses in which the portal lets the user edit the onboarding steps. */
export const EDITABLE_ONBOARDING_STATUSES = ["DRAFT", "PENDING_SUBMISSION", "REPROVADO"];

export type PersonalDataStep = {
  full_name: string;
  cpf: string;
  rg_number: string;
  rg_state: string;
  /** YYYY-MM-DD */
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

/**
 * Terms acceptance — sent ONLY from an explicit user action: both checkboxes ticked and the full name typed
 * as the digital signature (the portal synthesizes the signature; the app never pre-fills acceptance).
 */
export type TermsStep = {
  accepted_contract: boolean;
  accepted_privacy_policy: boolean;
  digital_signature: string;
  terms_version: string;
};

export const TERMS_VERSION = "v1";

type Target = { role: "LICENCIADO" | "SUBLICENCIADO"; id: string; base: string };

function target(me: AuthMe): Target | null {
  if (me.tipoUsuarioResolvido === "SUBLICENCIADO" && me.sublicenciadoId) {
    return { role: "SUBLICENCIADO", id: me.sublicenciadoId, base: `/v1/onboarding/sublicenciado/${encodeURIComponent(me.sublicenciadoId)}` };
  }
  if (me.tipoUsuarioResolvido === "LICENCIADO" && me.licenciadoId) {
    return { role: "LICENCIADO", id: me.licenciadoId, base: `/v1/onboarding/licenciado/${encodeURIComponent(me.licenciadoId)}` };
  }
  return null;
}

function requireTarget(me: AuthMe): Target {
  const t = target(me);
  if (!t) throw new Error("Cadastro não iniciado.");
  return t;
}

/** Status check: `null` when there is no business record yet or the onboarding does not exist (404). */
export async function getOnboarding(api: ApiClient, me: AuthMe): Promise<Onboarding | null> {
  const t = target(me);
  if (!t) return null;
  try {
    return await api.get<Onboarding>(t.base);
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

/** Portal splash/onboarding: `POST /v1/onboarding/iniciar` or `iniciar-sublicenciado` (idempotent). */
export function startOnboarding(api: ApiClient, me: AuthMe): Promise<Onboarding> {
  const t = requireTarget(me);
  return t.role === "LICENCIADO"
    ? api.post<Onboarding>("/v1/onboarding/iniciar", { licenciado_id: t.id })
    : api.post<Onboarding>("/v1/onboarding/iniciar-sublicenciado", { sublicenciado_id: t.id });
}

/** Portal "já cadastrado" check before the personal-data step (CPF / e-mail / phone). */
export type UniquenessResult = { cpfUnique?: boolean; emailUnique?: boolean; phoneUnique?: boolean };

export function validateUniqueness(api: ApiClient, me: AuthMe, data: { cpf: string; email: string; phone: string }): Promise<UniquenessResult> {
  return api.post<UniquenessResult>("/v1/onboarding/validate-uniqueness", {
    ...data,
    licenciado_id: me.tipoUsuarioResolvido === "LICENCIADO" ? (me.licenciadoId ?? undefined) : undefined
  });
}

export function savePersonalData(api: ApiClient, me: AuthMe, data: PersonalDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/dados-pessoais`, data);
}

/** Licenciado only. */
export function saveProfessionalData(api: ApiClient, me: AuthMe, data: ProfessionalDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/dados-profissionais`, data);
}

/** Licenciado only. */
export function saveBankData(api: ApiClient, me: AuthMe, data: BankDataStep): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/dados-bancarios`, data);
}

export function saveDocumentsStep(api: ApiClient, me: AuthMe, documentIds: string[]): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/documentos`, { documento_ids: documentIds });
}

export function saveTerms(api: ApiClient, me: AuthMe, data: TermsStep): Promise<Onboarding> {
  if (!data.accepted_contract || !data.accepted_privacy_policy || !data.digital_signature.trim()) {
    throw new Error("O aceite precisa ser confirmado pelo usuário.");
  }
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/termos`, data);
}

/** Representative only: confirm the parent company shown by the backend. */
export function saveCompanyCheck(api: ApiClient, me: AuthMe, codigoLicenciado: string): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/conferencia-empresa`, {
    empresa_confirmada: true,
    codigo_licenciado: codigoLicenciado
  });
}

/** Representative only: confirm the login e-mail (cannot be changed here). */
export function saveLoginCheck(api: ApiClient, me: AuthMe, email: string): Promise<Onboarding> {
  return api.put<Onboarding>(`${requireTarget(me).base}/etapas/dados-login`, { login_confirmado: true, email });
}

/** The backend rejects submission while steps are pending. */
export function submitOnboarding(api: ApiClient, me: AuthMe, idempotencyKey: string): Promise<Onboarding> {
  return api.post<Onboarding>(`${requireTarget(me).base}/submit`, undefined, { idempotencyKey });
}
