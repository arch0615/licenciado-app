import type { AccountRole, AccountStatus } from "@/features/auth/types";
import type { Tone } from "@/theme/tokens";

/**
 * Single source of human labels for backend enums (docs/mobile-design-system.md §5.4).
 * Screens must never render raw enum values. Add one map per domain as features are built
 * (client, journey, commission, payment, order, ticket, document, member, invitation).
 */
export const accountStatusLabels: Record<AccountStatus, { label: string; tone: Tone }> = {
  PENDENTE_APROVACAO: { label: "Em cadastro", tone: "info" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO: { label: "Aprovado", tone: "success" },
  REPROVADO: { label: "Precisa de ajustes", tone: "danger" },
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
  PENDENTE_APROVACAO: { label: "Em cadastro", tone: "info" },
  INATIVO: { label: "Inativo", tone: "neutral" }
};
export const clientStatusLabel = (status: string | null | undefined) => lookup(clientStatusLabels, status);

const journeyStatusLabels: Record<string, Label> = {
  EM_CADASTRO: { label: "Em cadastro", tone: "info" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO_AGUARDANDO_UC: { label: "Aguardando UC", tone: "warning" },
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
  GERADA: { label: "Prevista", tone: "info" },
  APROVADA: { label: "Liberada", tone: "success" },
  EM_LOTE: { label: "Em pagamento", tone: "highlight" },
  PAGA: { label: "Paga", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "neutral" },
  ESTORNADA: { label: "Estornada", tone: "danger" }
};
export const commissionStatusLabel = (status: string | null | undefined) => lookup(commissionStatusLabels, status);

const paymentStatusLabels: Record<string, Label> = {
  PENDENTE: { label: "Pendente", tone: "info" },
  EM_LOTE: { label: "Em lote", tone: "highlight" },
  PROCESSANDO: { label: "Processando", tone: "highlight" },
  PAGO: { label: "Pago", tone: "success" },
  FALHOU_TECNICO: { label: "Falhou", tone: "danger" },
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
