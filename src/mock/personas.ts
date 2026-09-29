import type { AuthMe, Permission } from "@/features/auth/types";

/**
 * Development personas (EXPO_PUBLIC_USE_MOCKS=true only). One per routing case in
 * docs/mobile-navigation.md §2.1. Never shipped in production builds (guarded in app.config.ts).
 */
export type MockPersonaId =
  | "licenciado-aprovado"
  | "sublicenciado-aprovado"
  | "licenciado-pendente"
  | "sublicenciado-pendente"
  | "licenciado-sem-cadastro"
  | "conta-suspensa"
  | "sem-acesso-plataforma";

export type MockPersona = {
  id: MockPersonaId;
  label: string;
  description: string;
  email: string;
  /** `/v1/auth/me` response, or an error the mock backend returns instead. */
  me: AuthMe | { error: { status: number; code: string; message: string } };
};

/** Same grants as licenciado-api ROLE_PERMISSIONS. */
const LICENCIADO_PERMISSIONS: Permission[] = [
  "profile:read",
  "profile:update",
  "onboarding:self",
  "team:read",
  "team:invite",
  "clients:read",
  "clients:write",
  "commissions:read",
  "payments:read",
  "marketplace:use",
  "training:use",
  "support:use",
  "notifications:read"
];
const SUBLICENCIADO_PERMISSIONS: Permission[] = [
  "profile:read",
  "profile:update",
  "onboarding:self",
  "clients:read",
  "clients:write",
  "commissions:read",
  "training:use",
  "support:use",
  "notifications:read"
];

const base = {
  permissions: ["profile:read", "profile:update", "onboarding:self", "training:use", "support:use"] as Permission[],
  displayName: null,
  licenciadoId: null,
  sublicenciadoId: null
};

export const MOCK_PERSONAS: MockPersona[] = [
  {
    id: "licenciado-aprovado",
    label: "Licenciado aprovado",
    description: "Acesso completo: Início, Clientes, Comissões, Equipe, Mais",
    email: "licenciado@acvel.dev",
    me: {
      ...base,
      userId: "u-lic-1",
      uid: "mock-lic-1",
      email: "licenciado@acvel.dev",
      displayName: "Maria Licenciada",
      roleSlug: "licenciado_master",
      tipoUsuarioResolvido: "LICENCIADO",
      permissions: LICENCIADO_PERMISSIONS,
      licenciadoId: "lic-1",
      accountStatus: "APROVADO",
      approvalStatus: "APPROVED",
      features: { marketplace: false }
    }
  },
  {
    id: "sublicenciado-aprovado",
    label: "Representante aprovado",
    description: "Aba 4 = Academy; sem Equipe",
    email: "representante@acvel.dev",
    me: {
      ...base,
      userId: "u-sub-1",
      uid: "mock-sub-1",
      email: "representante@acvel.dev",
      displayName: "João Representante",
      roleSlug: "sublicenciado_vendedor",
      tipoUsuarioResolvido: "SUBLICENCIADO",
      permissions: SUBLICENCIADO_PERMISSIONS,
      licenciadoId: "lic-1",
      sublicenciadoId: "sub-1",
      accountStatus: "APROVADO",
      approvalStatus: "APPROVED"
    }
  },
  {
    id: "licenciado-pendente",
    label: "Licenciado em análise",
    description: "Área de pré-aprovação: Cadastro, Academy, Ajuda, Perfil",
    email: "pendente@acvel.dev",
    me: {
      ...base,
      userId: "u-lic-2",
      uid: "mock-lic-2",
      email: "pendente@acvel.dev",
      displayName: "Carla Pendente",
      roleSlug: "licenciado_master",
      tipoUsuarioResolvido: "LICENCIADO",
      licenciadoId: "lic-2",
      accountStatus: "EM_ANALISE",
      approvalStatus: "NOT_APPROVED"
    }
  },
  {
    id: "sublicenciado-pendente",
    label: "Representante em cadastro",
    description: "Pré-aprovação do representante",
    email: "rep-pendente@acvel.dev",
    me: {
      ...base,
      userId: "u-sub-2",
      uid: "mock-sub-2",
      email: "rep-pendente@acvel.dev",
      displayName: "Ana Representante",
      roleSlug: "sublicenciado_vendedor",
      tipoUsuarioResolvido: "SUBLICENCIADO",
      licenciadoId: "lic-1",
      sublicenciadoId: "sub-2",
      accountStatus: "PENDENTE_APROVACAO",
      approvalStatus: "NOT_APPROVED"
    }
  },
  {
    id: "licenciado-sem-cadastro",
    label: "Licenciado recém-cadastrado",
    description: "Conta criada, cadastro ainda não iniciado (NO_RECORD)",
    email: "novo@acvel.dev",
    me: {
      ...base,
      userId: "u-lic-3",
      uid: "mock-lic-3",
      email: "novo@acvel.dev",
      roleSlug: "licenciado_master",
      tipoUsuarioResolvido: "LICENCIADO",
      accountStatus: null,
      approvalStatus: "NO_RECORD"
    }
  },
  {
    id: "conta-suspensa",
    label: "Conta suspensa",
    description: "Tela de acesso bloqueado",
    email: "suspenso@acvel.dev",
    me: {
      ...base,
      userId: "u-lic-4",
      uid: "mock-lic-4",
      email: "suspenso@acvel.dev",
      roleSlug: "licenciado_master",
      tipoUsuarioResolvido: "LICENCIADO",
      licenciadoId: "lic-4",
      accountStatus: "SUSPENSO",
      approvalStatus: "SUSPENDED"
    }
  },
  {
    id: "sem-acesso-plataforma",
    label: "Usuário de outra plataforma",
    description: "Backend responde 403 PLATFORM_FORBIDDEN",
    email: "outro@acvel.dev",
    me: {
      error: { status: 403, code: "PLATFORM_FORBIDDEN", message: "Seu perfil não tem acesso a esta plataforma." }
    }
  }
];

export const DEFAULT_PERSONA_ID: MockPersonaId = "licenciado-aprovado";

export function findPersona(id: string | null | undefined): MockPersona | undefined {
  return MOCK_PERSONAS.find((persona) => persona.id === id);
}

export function findPersonaByEmail(email: string): MockPersona | undefined {
  const normalized = email.trim().toLowerCase();
  return MOCK_PERSONAS.find((persona) => persona.email === normalized);
}
