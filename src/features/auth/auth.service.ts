import type { LicenciadoProfile, SublicenciadoProfile } from "@/features/profile/types";
import { ApiError, isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

import type { AccountRole, AccountStatus, AppStatus, ApprovalStatus, AuthMe, Permission } from "./types";

const ACCOUNT_ROLES = ["LICENCIADO", "SUBLICENCIADO", "STAFF"] as const;
const ACCOUNT_STATUSES = [
  "PENDENTE_APROVACAO",
  "EM_ANALISE",
  "APROVADO",
  "REPROVADO",
  "SUSPENSO",
  "INATIVO",
  "BLOQUEADO"
] as const;
const APPROVAL_STATUSES = ["APPROVED", "NOT_APPROVED", "SUSPENDED", "INACTIVE", "BLOCKED", "NO_RECORD", "STAFF"] as const;

/** Exact role slugs → account type (never substring matching: `admin_licenciado` is staff). */
const ROLE_SLUGS: Record<string, AccountRole> = {
  licenciado_master: "LICENCIADO",
  sublicenciado_vendedor: "SUBLICENCIADO"
};

const str = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const oneOf = <T extends string>(values: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : null;

const forbidden = () =>
  new ApiError({
    status: 403,
    code: "PLATFORM_FORBIDDEN",
    message: "Sua conta não tem acesso a este aplicativo."
  });

function resolveRole(raw: Record<string, unknown>): AccountRole | null {
  const explicit = oneOf(ACCOUNT_ROLES, raw.tipoUsuarioResolvido) ?? oneOf(ACCOUNT_ROLES, raw.tipoUsuario);
  if (explicit) return explicit;
  const slugs = [raw.roleSlug, raw.role, ...(Array.isArray(raw.roles) ? raw.roles : [])]
    .map((entry) => (typeof entry === "object" && entry !== null ? (entry as { slug?: unknown }).slug : entry))
    .filter((slug): slug is string => typeof slug === "string");
  for (const slug of slugs) {
    if (slug.startsWith("admin")) return "STAFF";
    const role = ROLE_SLUGS[slug];
    if (role) return role;
  }
  return null;
}

/** Account status → approval, identical to licenciado-api `computeApprovalState`. */
export function approvalFromStatus(own: AccountStatus | null, parent: AccountStatus | null, role: AccountRole): ApprovalStatus {
  if (role === "STAFF") return "STAFF";
  if (!own) return "NO_RECORD";
  const map = (status: AccountStatus): Exclude<ApprovalStatus, "NO_RECORD" | "STAFF"> => {
    switch (status) {
      case "APROVADO":
        return "APPROVED";
      case "SUSPENSO":
        return "SUSPENDED";
      case "INATIVO":
        return "INACTIVE";
      case "BLOQUEADO":
        return "BLOCKED";
      default:
        return "NOT_APPROVED";
    }
  };
  const ownApproval = map(own);
  if (ownApproval !== "APPROVED" || role !== "SUBLICENCIADO") return ownApproval;
  if (!parent) return "NOT_APPROVED";
  return map(parent);
}

/**
 * Validates `GET /v1/auth/me`. Fails closed: no user id or no recognizable role → PLATFORM_FORBIDDEN.
 * `approvalStatus` stays null when the auth service does not compute it (legacy service).
 */
export function normalizeAuthMe(body: unknown): Omit<AuthMe, "approvalStatus"> & { approvalStatus: ApprovalStatus | null } {
  if (typeof body !== "object" || body === null) throw forbidden();
  const raw = body as Record<string, unknown>;
  const userId = str(raw.userId) ?? str(raw.user_id) ?? str(raw.uid) ?? str(raw.sub);
  const role = resolveRole(raw);
  if (!userId || !role) throw forbidden();
  const permissions = Array.isArray(raw.permissions)
    ? raw.permissions.filter((entry): entry is Permission => typeof entry === "string")
    : null;
  return {
    userId,
    uid: str(raw.uid) ?? userId,
    email: str(raw.email) ?? "",
    displayName: str(raw.displayName),
    roleSlug: str(raw.roleSlug) ?? str(raw.role) ?? "",
    tipoUsuarioResolvido: role,
    permissions,
    licenciadoId: str(raw.licenciadoId),
    sublicenciadoId: str(raw.sublicenciadoId),
    accountStatus: oneOf(ACCOUNT_STATUSES, raw.accountStatus),
    approvalStatus: oneOf(APPROVAL_STATUSES, raw.approvalStatus)
  };
}

async function recordOrNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

/**
 * Server-resolved identity and access context (role, tenant, approval).
 * licenciado-api returns `approvalStatus` directly; for a legacy auth service without it, the
 * approval is read from the caller's own business record (`/v1/licenciados/me` or
 * `/v1/sublicenciados/me`, 404 → NO_RECORD). The role always comes from the server.
 */
export async function fetchMe(api: ApiClient): Promise<AuthMe> {
  const me = normalizeAuthMe(await api.get<unknown>("/v1/auth/me", { service: "auth" }));
  if (me.approvalStatus) return { ...me, approvalStatus: me.approvalStatus };

  if (me.tipoUsuarioResolvido === "STAFF") return { ...me, approvalStatus: "STAFF" };
  if (me.tipoUsuarioResolvido === "LICENCIADO") {
    const record = await recordOrNull(api.get<LicenciadoProfile>("/v1/licenciados/me"));
    const status = oneOf(ACCOUNT_STATUSES, record?.status);
    return {
      ...me,
      licenciadoId: record?.id ?? me.licenciadoId,
      accountStatus: status,
      approvalStatus: approvalFromStatus(status, status, "LICENCIADO")
    };
  }
  const record = await recordOrNull(api.get<SublicenciadoProfile>("/v1/sublicenciados/me"));
  const status = oneOf(ACCOUNT_STATUSES, record?.status);
  const parent = oneOf(ACCOUNT_STATUSES, record?.licenciado?.status);
  return {
    ...me,
    sublicenciadoId: record?.id ?? me.sublicenciadoId,
    licenciadoId: record?.licenciado?.id ?? me.licenciadoId,
    accountStatus: status,
    approvalStatus: approvalFromStatus(status, parent, "SUBLICENCIADO")
  };
}

/**
 * Remote app status (maintenance / minimum version). The endpoint is planned (MOB-API-4) and not in
 * Swagger; until it exists, any failure means "not in maintenance" — availability must not depend on it.
 */
export async function fetchAppStatus(api: ApiClient): Promise<AppStatus> {
  try {
    return await api.get<AppStatus>("/v1/app/status", { authenticated: false, service: "business" });
  } catch {
    return { maintenance: false };
  }
}

export type RegisterInput = { email: string; password: string; displayName?: string | null };
export type RegisteredUser = { user: { userId: string; email: string; displayName: string | null } };

/** `POST /v1/auth/register-licenciado` (public). The backend creates the Firebase user; the app then signs in. */
export function registerLicenciado(api: ApiClient, input: RegisterInput): Promise<RegisteredUser> {
  return api.post<RegisteredUser>(
    "/v1/auth/register-licenciado",
    { email: input.email.trim().toLowerCase(), password: input.password, displayName: input.displayName ?? null },
    { authenticated: false, service: "auth" }
  );
}

/**
 * `POST /v1/auth/register-sublicenciado` (public). The live ACVEL API links the representative by
 * `codigo_licenciado` (validated server-side); licenciado-api uses a single-use `convite` token instead.
 */
export function registerSublicenciado(
  api: ApiClient,
  input: RegisterInput & ({ codigoLicenciado: string; convite?: undefined } | { convite: string; codigoLicenciado?: undefined })
): Promise<RegisteredUser> {
  return api.post<RegisteredUser>(
    "/v1/auth/register-sublicenciado",
    {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      displayName: input.displayName ?? null,
      ...(input.convite ? { convite: input.convite } : { codigo_licenciado: input.codigoLicenciado })
    },
    { authenticated: false, service: "auth" }
  );
}

/** Live API: `POST /v1/sublicenciados/validate-codigo` (public, 2xx = valid code). */
export async function validateLicenciadoCode(api: ApiClient, codigo: string): Promise<true> {
  await api.post("/v1/sublicenciados/validate-codigo", { codigo_licenciado: codigo.trim().toUpperCase() }, { authenticated: false });
  return true;
}

export type InvitationValidation = {
  valid: true;
  licenciado: { nome: string | null };
  email_restrito: boolean;
  expires_at: string;
};

/** `POST /v1/convites/validar` (public; token in the body, never in a URL sent to the server). */
export function validateInvitation(api: ApiClient, token: string): Promise<InvitationValidation> {
  return api.post<InvitationValidation>("/v1/convites/validar", { token }, { authenticated: false, service: "business" });
}
