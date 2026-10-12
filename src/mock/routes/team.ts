import type { TeamInvitation, TeamMemberDetail } from "@/features/team/types";
import { ApiError } from "@/services/api/errors";
import type { MockRoute } from "@/services/api/mock-transport";

import { requireApproved, requireRole } from "./account";

const members: TeamMemberDetail[] = [
  {
    id: "sub-1",
    codigo_licenciado: "LIC-4821",
    codigo_sublicenciado: "REP-0192",
    nome_completo: "João Representante",
    email: "representante@acvel.dev",
    status: "APROVADO",
    created_at: "2026-02-10T12:00:00.000Z",
    total_consumidores: 11,
    total_ucs: 14,
    comissao_prevista_mes: 38.25,
    onboarding: { etapa_atual: null },
    telefone: "11912345678",
    cpf_mascarado: "***.111.222-**",
    reprovado_motivo: null,
    documentos: [
      { id: "d-1", tipo: "RG", status_validacao: "APROVADO", arquivo_nome: "rg.jpg", reprovado_motivo: null, created_at: "2026-02-11T12:00:00.000Z" }
    ]
  },
  {
    id: "sub-2",
    codigo_licenciado: "LIC-4821",
    codigo_sublicenciado: "REP-0207",
    nome_completo: "Ana Representante",
    email: "rep-pendente@acvel.dev",
    status: "PENDENTE_APROVACAO",
    created_at: "2026-09-01T12:00:00.000Z",
    total_consumidores: 0,
    total_ucs: 0,
    comissao_prevista_mes: null,
    onboarding: { etapa_atual: "DOCUMENTOS" },
    telefone: null,
    cpf_mascarado: null,
    reprovado_motivo: null,
    documentos: []
  }
];

const invitations: TeamInvitation[] = [
  {
    id: "inv-1",
    email: "novo.rep@exemplo.com",
    status: "ATIVO",
    expires_at: "2026-10-05T12:00:00.000Z",
    created_at: "2026-09-28T12:00:00.000Z",
    accepted_at: null
  },
  {
    id: "inv-0",
    email: null,
    status: "ACEITO",
    expires_at: "2026-09-08T12:00:00.000Z",
    created_at: "2026-09-01T12:00:00.000Z",
    accepted_at: "2026-09-01T15:00:00.000Z"
  }
];

const guard = () => {
  requireRole("LICENCIADO");
  requireApproved();
};

export const teamRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/v1/sublicenciados/equipe",
    handler: () => {
      guard();
      return {
        total: members.length,
        data: members.map(({ telefone: _t, cpf_mascarado: _c, reprovado_motivo: _r, documentos: _d, ...item }) => item)
      };
    }
  },
  { method: "GET", path: "/v1/sublicenciados/convites", handler: () => (guard(), { data: invitations }) },
  {
    method: "GET",
    path: "/v1/sublicenciados/:id",
    handler: ({ params }) => {
      guard();
      const member = members.find((item) => item.id === params.id);
      if (!member) throw new ApiError({ status: 404, code: "SUBLICENCIADO_NOT_FOUND", message: "Representante não encontrado." });
      return member;
    }
  }
];
