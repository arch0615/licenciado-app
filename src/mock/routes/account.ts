import type { AuthMe } from "@/features/auth/types";
import type { LicenciadoProfile, SublicenciadoProfile } from "@/features/profile/types";
import { ApiError } from "@/services/api/errors";
import type { MockRoute } from "@/services/api/mock-transport";

import { mockState } from "../mock-state";
import { findPersona } from "../personas";

/** Current persona's /v1/auth/me, or the error the persona simulates. */
export function currentMe(): AuthMe {
  const persona = findPersona(mockState.currentPersonaId);
  if (!persona) throw new ApiError({ status: 401, code: "MISSING_TOKEN", message: "Autenticação ausente." });
  if ("error" in persona.me) throw new ApiError(persona.me.error);
  return persona.me;
}

export function requireRole(role: AuthMe["tipoUsuarioResolvido"]): AuthMe {
  const me = currentMe();
  if (me.tipoUsuarioResolvido !== role) {
    throw new ApiError({ status: 403, code: "FORBIDDEN_ROLE", message: "Você não tem permissão para esta ação." });
  }
  return me;
}

export function requireApproved(): AuthMe {
  const me = currentMe();
  if (me.approvalStatus !== "APPROVED") {
    throw new ApiError({ status: 403, code: "ACCOUNT_NOT_APPROVED", message: "Seu cadastro ainda não foi aprovado." });
  }
  return me;
}

const notFound = () => new ApiError({ status: 404, code: "ACCOUNT_NOT_FOUND", message: "Cadastro não encontrado." });

const profileEdits = new Map<string, Partial<Pick<LicenciadoProfile, "nome_completo" | "telefone">>>();

function licenciadoProfile(me: AuthMe): LicenciadoProfile {
  if (!me.licenciadoId || !me.accountStatus) throw notFound();
  return {
    id: me.licenciadoId,
    codigo_licenciado: "LIC-4821",
    codigo_cupom: "MARIA10",
    status: me.accountStatus,
    reprovado_motivo: null,
    tipo_pessoa: "JURIDICA",
    licenciado_type: "EMPRESA",
    email: me.email,
    nome_completo: me.displayName,
    telefone: "11987654321",
    cpf: "***.456.789-**",
    rg_ie: null,
    data_nascimento: null,
    cnpj: "12.345.678/0001-90",
    razao_social: "Maria Energia Ltda",
    nome_fantasia: "Maria Energia",
    cep: "01310100",
    logradouro: "Av. Paulista",
    numero: "1000",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    uf: "SP",
    avatar_url: null,
    created_at: "2025-11-03T12:00:00.000Z",
    ...profileEdits.get(me.userId)
  };
}

function sublicenciadoProfile(me: AuthMe): SublicenciadoProfile {
  if (!me.sublicenciadoId || !me.accountStatus) throw notFound();
  return {
    id: me.sublicenciadoId,
    codigo_licenciado: "LIC-4821",
    codigo_sublicenciado: "REP-0192",
    codigo_cupom: "JOAO5",
    status: me.accountStatus,
    reprovado_motivo: null,
    email: me.email,
    nome_completo: me.displayName,
    telefone: "11912345678",
    cpf: "***.111.222-**",
    rg: null,
    rg_uf: null,
    data_nascimento: null,
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: "Campinas",
    uf: "SP",
    created_at: "2026-02-10T12:00:00.000Z",
    licenciado: {
      id: me.licenciadoId ?? "lic-1",
      codigo_licenciado: "LIC-4821",
      razao_social: "Maria Energia Ltda",
      nome_fantasia: "Maria Energia",
      cnpj: "12.345.678/0001-90",
      status: "APROVADO"
    }
  };
}


function applyEdit(body: unknown): void {
  const me = currentMe();
  const { nome_completo, telefone } = (body ?? {}) as { nome_completo?: string; telefone?: string };
  profileEdits.set(me.userId, { ...profileEdits.get(me.userId), ...(nome_completo ? { nome_completo } : {}), ...(telefone ? { telefone } : {}) });
}

let deletionRequestedAt: string | null = null;

export const accountRoutes: MockRoute[] = [
  { method: "GET", path: "/v1/licenciados/me", handler: () => licenciadoProfile(requireRole("LICENCIADO")) },
  {
    method: "PATCH",
    path: "/v1/licenciados/:id",
    handler: ({ params, request }) => {
      const me = requireRole("LICENCIADO");
      if (params.id !== me.licenciadoId) throw new ApiError({ status: 403, code: "FORBIDDEN", message: "Sem permissão." });
      applyEdit(request.body);
      return licenciadoProfile(me);
    }
  },
  { method: "PUT", path: "/v1/auth/profile", handler: () => (currentMe(), { ok: true }) },
  {
    method: "POST",
    path: "/v1/licenciados/bootstrap-me",
    handler: () => {
      const me = requireRole("LICENCIADO");
      // Simulate the backend creating the record: the persona moves to "em cadastro".
      Object.assign(me, { licenciadoId: "lic-3", accountStatus: "PENDENTE_APROVACAO", approvalStatus: "NOT_APPROVED" });
      return licenciadoProfile(me);
    }
  },
  {
    method: "POST",
    path: "/v1/sublicenciados/bootstrap-me",
    handler: () => {
      const me = requireRole("SUBLICENCIADO");
      Object.assign(me, { sublicenciadoId: "sub-3", accountStatus: "PENDENTE_APROVACAO", approvalStatus: "NOT_APPROVED" });
      return { id: "sub-3" };
    }
  },
  { method: "GET", path: "/v1/sublicenciados/me", handler: () => sublicenciadoProfile(requireRole("SUBLICENCIADO")) },
  {
    method: "GET",
    path: "/v1/licenciados/me/contrato",
    handler: () => {
      const me = requireRole("LICENCIADO");
      if (me.approvalStatus !== "APPROVED") return null;
      return {
        id: "ct-1",
        status: "ASSINADO",
        provider: "ZAPSIGN",
        signing_url: null,
        sent_at: "2025-11-20T12:00:00.000Z",
        signed_at: "2025-11-21T15:30:00.000Z"
      };
    }
  },
  {
    method: "GET",
    path: "/v1/auth/sessions/me",
    handler: () => {
      currentMe();
      return {
        sessions: [
          { id: "s-1", deviceLabel: "Este celular", lastSeenAt: new Date().toISOString(), isCurrent: true },
          { id: "s-2", deviceLabel: "Chrome · Windows", lastSeenAt: "2026-09-20T18:12:00.000Z", isCurrent: false }
        ]
      };
    }
  },
  { method: "DELETE", path: "/v1/auth/sessions/me/:id", handler: () => null },
  { method: "DELETE", path: "/v1/auth/sessions/me", handler: () => null },
  {
    method: "POST",
    path: "/v1/auth/account/delete-request",
    handler: () => {
      currentMe();
      deletionRequestedAt ??= new Date().toISOString();
      return { requestedAt: deletionRequestedAt, status: "REQUESTED" };
    }
  },
  {
    method: "POST",
    path: "/v1/auth/register-licenciado",
    handler: ({ request }) => {
      const { email, displayName } = request.body as { email: string; displayName?: string | null };
      if (email === "licenciado@acvel.dev") {
        throw new ApiError({ status: 409, code: "EMAIL_ALREADY_REGISTERED", message: "Este e-mail já está cadastrado." });
      }
      return { user: { userId: "u-new", email, displayName: displayName ?? null } };
    }
  },
  {
    method: "POST",
    path: "/v1/auth/register-sublicenciado",
    handler: ({ request }) => {
      const { email, displayName } = request.body as { email: string; displayName?: string | null };
      return { user: { userId: "u-new-sub", email, displayName: displayName ?? null } };
    }
  },
  {
    method: "POST",
    path: "/v1/sublicenciados/validate-codigo",
    handler: ({ request }) => {
      const { codigo_licenciado } = (request.body ?? {}) as { codigo_licenciado?: string };
      if (codigo_licenciado !== "LIC-4821") throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Código não encontrado." });
      return { valid: true, licenciado: { nome_fantasia: "Maria Energia" } };
    }
  },
  {
    method: "POST",
    path: "/v1/convites/validar",
    handler: ({ request }) => {
      const { token } = (request.body ?? {}) as { token?: string };
      if (token === "expirado") {
        throw new ApiError({ status: 410, code: "INVITATION_EXPIRED", message: "Este convite expirou." });
      }
      if (!token || token === "invalido") {
        throw new ApiError({ status: 404, code: "INVITATION_NOT_FOUND", message: "Convite inválido." });
      }
      return {
        valid: true,
        licenciado: { nome: "Maria Energia" },
        email_restrito: false,
        expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString()
      };
    }
  }
];
