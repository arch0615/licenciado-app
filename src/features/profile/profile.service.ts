import type { AppRole } from "@/features/auth/route-state";
import type { AuthMe } from "@/features/auth/types";
import { ApiError, isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

import type { AccountProfile, LicenciadoProfile, LicenciadoProfileUpdate, SublicenciadoProfile } from "./types";

/**
 * Profile & account.
 * GET /v1/licenciados/me, GET /v1/sublicenciados/me, contract; licenciado name/phone edit and first-access
 * bootstrap as in the portal. Account/security: end sessions, account-deletion request (LGPD / store rule).
 * Inventory only (not in Swagger — unverified): contract B16, sessions A6–A8, deletion request A9.
 * The role passed in always comes from GET /v1/auth/me; no id is ever sent — the backend uses the token.
 */
export async function getProfile(api: ApiClient, role: AppRole): Promise<AccountProfile> {
  if (role === "LICENCIADO") {
    return { role, data: await api.get<LicenciadoProfile>("/v1/licenciados/me") };
  }
  return { role, data: await api.get<SublicenciadoProfile>("/v1/sublicenciados/me") };
}

/**
 * Portal /perfil "Editar dados" is available to licenciados (`PATCH /v1/licenciados/{id}` + auth profile).
 * Representatives: the portal edits the PARENT licenciado's record for them (portal bug), so the app does not
 * offer it — there is no representative self-update endpoint (backend gap).
 */
export function canUpdateProfile(me: Pick<AuthMe, "tipoUsuarioResolvido" | "licenciadoId">): boolean {
  return me.tipoUsuarioResolvido === "LICENCIADO" && Boolean(me.licenciadoId);
}

/**
 * Same writes as the portal: `PUT {AUTH}/v1/auth/profile {displayName, phoneNumber}` and
 * `PATCH /v1/licenciados/{id} {nome_completo, telefone, celular}`. The id comes from /v1/auth/me (server
 * resolved); the backend must reject ids that are not the caller's. E-mail changes are not sent (they need
 * the auth-provider verification flow).
 */
export async function updateProfile(
  api: ApiClient,
  me: Pick<AuthMe, "tipoUsuarioResolvido" | "licenciadoId">,
  changes: LicenciadoProfileUpdate
): Promise<AccountProfile> {
  if (!canUpdateProfile(me)) {
    throw new ApiError({ status: 403, code: "PROFILE_UPDATE_UNSUPPORTED", message: "Para alterar seus dados, fale com o suporte." });
  }
  const { nome_completo, telefone } = changes;
  await api.put("/v1/auth/profile", { displayName: nome_completo, phoneNumber: telefone }, { service: "auth" });
  await api.patch(`/v1/licenciados/${encodeURIComponent(me.licenciadoId!)}`, { nome_completo, telefone, celular: telefone });
  // The PATCH returns the admin DTO; re-read the self view the screens use.
  return { role: "LICENCIADO", data: await api.get<LicenciadoProfile>("/v1/licenciados/me") };
}

/**
 * Creates the caller's business record on first access (portal splash: licenciado on 404; representative
 * with the licenciado code used at signup — the backend validates it). Idempotent on the backend.
 */
export function bootstrapMe(api: ApiClient, role: AppRole, codigoLicenciado?: string | null): Promise<unknown> {
  if (role === "LICENCIADO") return api.post("/v1/licenciados/bootstrap-me");
  if (!codigoLicenciado) {
    throw new ApiError({
      status: 422,
      code: "CODIGO_LICENCIADO_REQUIRED",
      message: "Abra novamente o link de cadastro enviado pelo seu licenciado para concluir o primeiro acesso."
    });
  }
  return api.post("/v1/sublicenciados/bootstrap-me", { codigo_licenciado: codigoLicenciado });
}

/** B16 (inventory). 204 → no contract. SUB never sees the parent's contract. */
export type Contract = {
  id: string;
  status: "AGUARDANDO_ASSINATURA" | "ASSINADO" | "CANCELADO";
  provider: "ZAPSIGN" | "MANUAL";
  signing_url: string | null;
  sent_at: string | null;
  signed_at: string | null;
};

export async function getContract(api: ApiClient): Promise<Contract | null> {
  try {
    return (await api.get<Contract | null>("/v1/licenciados/me/contrato")) ?? null;
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

/** A6 (inventory): `SessionItem[]` or `{ sessions | data | items }`. */
export type SessionItem = { id: string; deviceLabel: string; lastSeenAt: string; isCurrent: boolean; locationHint?: string | null };

export async function listSessions(api: ApiClient): Promise<SessionItem[]> {
  const body = await api.get<unknown>("/v1/auth/sessions/me", { service: "auth" });
  if (Array.isArray(body)) return body as SessionItem[];
  const record = (body ?? {}) as Record<string, unknown>;
  const list = record.sessions ?? record.data ?? record.items;
  return Array.isArray(list) ? (list as SessionItem[]) : [];
}

export function revokeSession(api: ApiClient, sessionId: string): Promise<unknown> {
  return api.delete(`/v1/auth/sessions/me/${encodeURIComponent(sessionId)}`, { service: "auth" });
}

export function revokeAllSessions(api: ApiClient): Promise<unknown> {
  return api.delete("/v1/auth/sessions/me", { service: "auth" });
}

/** A9 (inventory, LGPD). The backend decides the outcome; the app only files the request. */
export type DeletionRequest = { requestedAt: string; status: "REQUESTED" | "ANONYMIZED" | "CANCELLED" };

export function requestAccountDeletion(api: ApiClient, idempotencyKey: string): Promise<DeletionRequest> {
  return api.post<DeletionRequest>("/v1/auth/account/delete-request", undefined, { service: "auth", idempotencyKey });
}
