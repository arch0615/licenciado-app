import type { AccountStatus } from "@/features/auth/types";

/** licenciado-api Swagger: GET /v1/sublicenciados/equipe (item). */
export type TeamMember = {
  id: string;
  codigo_licenciado: string;
  codigo_sublicenciado: string;
  nome_completo: string | null;
  email: string;
  status: AccountStatus;
  created_at: string;
  total_consumidores: number | null;
  total_ucs: number | null;
  comissao_prevista_mes: number | null;
  onboarding: { etapa_atual: string | null };
};

/** licenciado-api Swagger: GET /v1/sublicenciados/{sublicenciadoId}. */
export type TeamMemberDetail = TeamMember & {
  telefone: string | null;
  cpf_mascarado: string | null;
  reprovado_motivo: string | null;
  documentos: {
    id: string;
    tipo: string;
    status_validacao: string;
    arquivo_nome: string | null;
    reprovado_motivo: string | null;
    created_at: string;
  }[];
};

export type InvitationStatus = "ATIVO" | "ACEITO" | "EXPIRADO" | "REVOGADO";

/** licenciado-api Swagger: GET/DELETE /v1/sublicenciados/convites. */
export type TeamInvitation = {
  id: string;
  email: string | null;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
};

/** POST /v1/sublicenciados/convites (201): the raw token and link are returned only once. */
export type CreatedTeamInvitation = TeamInvitation & { token: string; link: string };

export type CreateInvitationInput = { email?: string; expires_in_days?: number };
