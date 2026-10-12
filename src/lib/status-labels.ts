import type { AccountRole, AccountStatus } from "@/features/auth/types";
import type { Tone } from "@/theme/tokens";

/**
 * Single source of human labels for backend enums (docs/mobile-design-system.md §5.4).
 * Screens must never render raw enum values. Add one map per domain as features are built
 * (client, journey, commission, payment, order, ticket, document, member, invitation).
 */
export const accountStatusLabels: Record<AccountStatus, { label: string; tone: Tone }> = {
  PENDENTE_APROVACAO: { label: "Pendente", tone: "info" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO: { label: "Aprovado", tone: "success" },
  REPROVADO: { label: "Reprovado", tone: "danger" },
  SUSPENSO: { label: "Suspenso", tone: "warning" },
  INATIVO: { label: "Inativo", tone: "neutral" },
  BLOQUEADO: { label: "Bloqueado", tone: "neutral" }
};

export function accountStatusLabel(status: AccountStatus | null): { label: string; tone: Tone } {
  if (!status) return { label: "Cadastro não iniciado", tone: "neutral" };
  return accountStatusLabels[status];
}

export const roleLabels: Record<AccountRole, string> = {
  LICENCIADO: "Licenciado",
  SUBLICENCIADO: "Representante",
  STAFF: "Equipe ACVEL"
};

type Label = { label: string; tone: Tone };

/** Unknown values fall back to a neutral, human label — never the raw enum. */
function lookup(map: Record<string, Label>, value: string | null | undefined, fallback = "Em atualização"): Label {
  return (value && map[value]) || { label: fallback, tone: "neutral" };
}

const clientStatusLabels: Record<string, Label> = {
  APROVADO: { label: "Ativo", tone: "success" },
  PENDENTE_APROVACAO: { label: "Em ativação", tone: "info" },
  INATIVO: { label: "Inativo", tone: "neutral" }
};
export const clientStatusLabel = (status: string | null | undefined) => lookup(clientStatusLabels, status);

const journeyStatusLabels: Record<string, Label> = {
  EM_CADASTRO: { label: "Em cadastro", tone: "info" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO_AGUARDANDO_UC: { label: "Aguardando unidade consumidora", tone: "warning" },
  UC_AGUARDANDO_COMPENSACAO: { label: "Aguardando compensação", tone: "warning" },
  COMPENSANDO_NORMAL: { label: "Compensando", tone: "success" },
  INADIMPLENTE: { label: "Inadimplente", tone: "danger" },
  SUSPENSO: { label: "Suspenso", tone: "warning" },
  CANCELADO: { label: "Cancelado", tone: "neutral" }
};
export const journeyStatusLabel = (status: string | null | undefined) => lookup(journeyStatusLabels, status);

const alertSeverityTones: Record<string, Tone> = { INFO: "info", WARNING: "warning", CRITICAL: "danger" };
export const alertSeverityTone = (severity: string | null | undefined): Tone =>
  (severity && alertSeverityTones[severity]) || "neutral";

const commissionStatusLabels: Record<string, Label> = {
  GERADA: { label: "Pendente", tone: "info" },
  APROVADA: { label: "Liberada", tone: "success" },
  EM_LOTE: { label: "Liberada", tone: "highlight" },
  PAGA: { label: "Paga", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "neutral" },
  ESTORNADA: { label: "Cancelada", tone: "danger" }
};
export const commissionStatusLabel = (status: string | null | undefined) => lookup(commissionStatusLabels, status);

const paymentStatusLabels: Record<string, Label> = {
  PENDENTE: { label: "Aguardando corte", tone: "info" },
  EM_LOTE: { label: "Em lote", tone: "highlight" },
  PROCESSANDO: { label: "Em processamento", tone: "highlight" },
  PAGO: { label: "Pago", tone: "success" },
  FALHOU_TECNICO: { label: "Falha técnica", tone: "danger" },
  FALHOU_BANCARIO: { label: "Falha bancária", tone: "danger" },
  CANCELADO: { label: "Cancelado", tone: "neutral" }
};
export const paymentStatusLabel = (status: string | null | undefined) => lookup(paymentStatusLabels, status);

const invitationStatusLabels: Record<string, Label> = {
  ATIVO: { label: "Aguardando cadastro", tone: "info" },
  ACEITO: { label: "Aceito", tone: "success" },
  EXPIRADO: { label: "Expirado", tone: "neutral" },
  REVOGADO: { label: "Cancelado", tone: "neutral" }
};
export const invitationStatusLabel = (status: string | null | undefined) => lookup(invitationStatusLabels, status);

const ticketStatusLabels: Record<string, Label> = {
  AGUARDANDO: { label: "Aguardando", tone: "info" },
  EM_ATENDIMENTO: { label: "Em atendimento", tone: "highlight" },
  RESOLVIDO: { label: "Resolvido", tone: "success" }
};
export const ticketStatusLabel = (status: string | null | undefined) => lookup(ticketStatusLabels, status);

const documentStatusLabels: Record<string, Label> = {
  PENDENTE: { label: "Pendente", tone: "info" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO: { label: "Aprovado", tone: "success" },
  REPROVADO: { label: "Reprovado", tone: "danger" }
};
export const documentStatusLabel = (status: string | null | undefined) => lookup(documentStatusLabels, status);

const orderStatusLabels: Record<string, Label> = {
  PENDENTE: { label: "Pendente", tone: "info" },
  CONFIRMADO: { label: "Confirmado", tone: "info" },
  EM_SEPARACAO: { label: "Em separação", tone: "highlight" },
  PROCESSANDO: { label: "Processando", tone: "highlight" },
  ENVIADO: { label: "Enviado", tone: "highlight" },
  ENTREGUE: { label: "Entregue", tone: "success" },
  CONCLUIDO: { label: "Concluído", tone: "success" },
  CANCELADO: { label: "Cancelado", tone: "neutral" },
  ESTORNADO: { label: "Estornado", tone: "neutral" }
};
export const orderStatusLabel = (status: string | null | undefined) => lookup(orderStatusLabels, status);

/** Journey stages as labelled by the portal (licenciado-web modules/tracking/kanbanRules.ts). */
export const JOURNEY_STAGES: { value: string; label: string }[] = [
  { value: "EM_CADASTRO", label: "Onboarding em andamento" },
  { value: "ANALISE_CADASTRO", label: "Análise cadastral ACVEL" },
  { value: "SEM_FATURA_UC", label: "Aprovado — falta fatura/UC" },
  { value: "FATURA_EM_ANALISE", label: "Fatura/UC em análise" },
  { value: "TERMO_PENDENTE", label: "Termo de adesão" },
  { value: "AGUARDANDO_CONCESSIONARIA", label: "Na concessionária" },
  { value: "COMPENSANDO", label: "Compensando" },
  { value: "INADIMPLENTE", label: "Inadimplente" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CANCELADO", label: "Cancelado" }
];
export const journeyStageLabel = (stage: string | null | undefined) =>
  JOURNEY_STAGES.find((item) => item.value === stage)?.label ?? "Em atualização";

/** Regions as labelled by the portal dashboard. */
export const REGION_LABELS: Record<string, string> = {
  NORTE: "Norte",
  NORDESTE: "Nordeste",
  CENTRO_OESTE: "Centro-Oeste",
  SUDESTE: "Sudeste",
  SUL: "Sul"
};

/** Notification types offered as filters by the portal inbox. */
export const NOTIFICATION_TYPES: { value: string; label: string }[] = [
  { value: "DOC_REPROVADO", label: "Documento reprovado" },
  { value: "UC_EM_ANALISE_TEMPO_ALTO", label: "UC em análise" },
  { value: "FATURA_EM_ATRASO", label: "Fatura em atraso" },
  { value: "NAO_COMPENSANDO_CICLOS", label: "Sem compensação" },
  { value: "INFO_GERAL", label: "Info geral" }
];

/** Payment statuses with the portal's wording (CommissionsPaymentsContent). */
const portalPaymentLabels: Record<string, Label> = {
  PENDENTE: { label: "Aguardando corte", tone: "info" },
  EM_LOTE: { label: "Em lote", tone: "highlight" },
  PROCESSANDO: { label: "Em processamento", tone: "highlight" },
  PAGO: { label: "Pago", tone: "success" },
  FALHOU_TECNICO: { label: "Falha técnica", tone: "danger" },
  FALHOU_BANCARIO: { label: "Falha bancária", tone: "danger" },
  CANCELADO: { label: "Cancelado", tone: "neutral" }
};
export const portalPaymentStatusLabel = (status: string | null | undefined) => lookup(portalPaymentLabels, status);

/** Onboarding step / pending-requirement codes (licenciado and representative wizards). */
const ONBOARDING_STEP_LABELS: Record<string, string> = {
  DOCUMENTOS: "Envio de documentos",
  DOCUMENTOS_ENVIADOS: "Envio de documentos",
  DADOS_PESSOAIS: "Dados pessoais",
  DADOS_PROFISSIONAIS: "Dados da empresa",
  DADOS_BANCARIOS: "Dados bancários",
  CONTRATO_ACEITO: "Aceite do contrato",
  TERMOS: "Aceite dos termos",
  TERMOS_ACEITOS: "Aceite dos termos",
  CONFERENCIA_EMPRESA: "Conferência da empresa",
  DADOS_LOGIN: "Dados de acesso",
  REVISAO: "Revisão e envio",
  EM_ANALISE: "Em análise"
};

/**
 * Label for an onboarding step or pending item. Backend codes (UPPER_SNAKE) are never shown: unknown codes
 * become a generic label. Free-text items (already human-readable) are shown as sent.
 */
export function onboardingStepLabel(code: string): string {
  const label = ONBOARDING_STEP_LABELS[code];
  if (label) return label;
  return /^[A-Z0-9_]+$/.test(code) ? "Etapa do cadastro" : code;
}

/** UC request (solicitação) statuses, exactly as the portal journey modal labels them (TrackingClientModal). */
const UC_REQUEST_STATUS_LABELS: Record<string, string> = {
  RESIDENCIA_CADASTRADA: "Fatura cadastrada",
  EM_ANALISE_ADMIN: "Em análise pela ACVEL",
  APROVADA_ADMIN: "Aprovada pela ACVEL",
  CONTRATO_GERADO: "Termo gerado",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  CONTRATO_ASSINADO: "Termo assinado",
  PRONTA_PARA_CONCESSIONARIA: "Pronta para a concessionária",
  ENVIADA_CONCESSIONARIA: "Enviada à concessionária",
  APROVADA_CONCESSIONARIA: "Aprovada pela concessionária",
  REPROVADA_CONCESSIONARIA: "Reprovada pela concessionária",
  ATIVA_COMPENSANDO: "Compensando",
  REPROVADA_ADMIN: "Reprovada pela ACVEL",
  SUSPENSA: "Suspensa",
  VINCULO_MANUAL: "Vínculo manual"
};
export const ucRequestStatusLabel = (status: string | null | undefined) =>
  (status && UC_REQUEST_STATUS_LABELS[status]) || "Em atualização";

/** Payment methods (the backend sends codes such as PIX / TED). Unknown codes are not shown. */
const PAYMENT_METHOD_LABELS: Record<string, string> = { PIX: "Pix", TED: "TED", BOLETO: "Boleto", TRANSFERENCIA: "Transferência" };
export const paymentMethodLabel = (method: string | null | undefined) => (method && PAYMENT_METHOD_LABELS[method]) || null;
