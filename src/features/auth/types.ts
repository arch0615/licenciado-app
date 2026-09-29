/**
 * Mirrors licenciado-api `GET /v1/auth/me` (see licenciado-web/docs/mobile-integration.md §4).
 * The app routes exclusively from this server-resolved context — never from local assumptions.
 */
export type AccountRole = "LICENCIADO" | "SUBLICENCIADO" | "STAFF";

export type AccountStatus =
  | "PENDENTE_APROVACAO"
  | "EM_ANALISE"
  | "APROVADO"
  | "REPROVADO"
  | "SUSPENSO"
  | "INATIVO"
  | "BLOQUEADO";

export type ApprovalStatus =
  | "APPROVED"
  | "NOT_APPROVED"
  | "SUSPENDED"
  | "INACTIVE"
  | "BLOCKED"
  | "NO_RECORD"
  | "STAFF";

/** Permission strings returned by licenciado-api (Swagger enum of `permissions`). */
export type Permission =
  | "profile:read"
  | "profile:update"
  | "onboarding:self"
  | "team:read"
  | "team:invite"
  | "clients:read"
  | "clients:write"
  | "commissions:read"
  | "payments:read"
  | "marketplace:use"
  | "training:use"
  | "support:use"
  | "notifications:read"
  | "admin:licenciados:read";

export type AuthMe = {
  userId: string;
  uid: string;
  email: string;
  displayName: string | null;
  roleSlug: string;
  tipoUsuarioResolvido: AccountRole;
  /**
   * Server-granted permissions. `null` = the auth service did not send a permission list (legacy
   * service): the UI then falls back to role defaults and the backend still enforces every call.
   */
  permissions: Permission[] | null;
  licenciadoId: string | null;
  sublicenciadoId: string | null;
  accountStatus: AccountStatus | null;
  approvalStatus: ApprovalStatus;
  /** Server feature flags (planned; see mobile-backend-requirements MOB-AUTH-4). */
  features?: { marketplace?: boolean };
};

/** Remote app status (planned backend endpoint `GET /v1/app/status`, MOB-API-4). */
export type AppStatus = {
  maintenance: boolean;
  message?: string | null;
  minSupportedVersion?: { ios?: string; android?: string } | null;
};

/** Identity from the auth provider (Firebase in production, mock in development). */
export type AuthIdentity = {
  uid: string;
  email: string | null;
};
