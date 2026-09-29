import type { AppRole } from "@/features/auth/route-state";
import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

import type {
  AccountProfile,
  LicenciadoProfile,
  LicenciadoProfileUpdate,
  SublicenciadoProfile,
  SublicenciadoProfileUpdate
} from "./types";

/**
 * Profile & account.
 * Swagger (licenciado-api): GET/PATCH /v1/licenciados/me, GET/PATCH /v1/sublicenciados/me,
 *   POST /v1/licenciados/bootstrap-me, POST /v1/sublicenciados/bootstrap-me.
 * Inventory only (not in Swagger — unverified): contract B16, sessions A6–A8, deletion request A9.
 * The role passed in always comes from GET /v1/auth/me; no id is ever sent — the backend uses the token.
 */
export async function getProfile(api: ApiClient, role: AppRole): Promise<AccountProfile> {
  if (role === "LICENCIADO") {
    return { role, data: await api.get<LicenciadoProfile>("/v1/licenciados/me") };
  }
  return { role, data: await api.get<SublicenciadoProfile>("/v1/sublicenciados/me") };
}

export async function updateProfile(
  api: ApiClient,
  role: AppRole,
  changes: LicenciadoProfileUpdate | SublicenciadoProfileUpdate
): Promise<AccountProfile> {
  if (role === "LICENCIADO") {
    return { role, data: await api.patch<LicenciadoProfile>("/v1/licenciados/me", changes) };
  }
  const { nome_completo, telefone } = changes;
  return { role, data: await api.patch<SublicenciadoProfile>("/v1/sublicenciados/me", { nome_completo, telefone }) };
}

/** Creates the caller's business record (first access). Idempotent on the backend. */
export function bootstrapMe(api: ApiClient, role: AppRole): Promise<unknown> {
  return api.post(role === "LICENCIADO" ? "/v1/licenciados/bootstrap-me" : "/v1/sublicenciados/bootstrap-me");
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
