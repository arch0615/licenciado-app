import * as Linking from "expo-linking";

import { config } from "@/config/env";
import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

import type {
  CreatedTeamInvitation,
  CreateInvitationInput,
  TeamInvitation,
  TeamMember,
  TeamMemberDetail
} from "./types";

/**
 * Team (licenciado only).
 *   Live ACVEL API: GET /v1/sublicenciados/equipe · GET /v1/sublicenciados/{id}.
 *   Token invitations (POST/GET /v1/sublicenciados/convites, DELETE .../{id}) exist only in licenciado-api;
 *   on the live API they 404 and the app falls back to the code-based signup link (see codeInviteLink).
 * The tenant is the caller's own licenciado (from the token); no licenciado id is sent.
 */
export function listTeam(api: ApiClient): Promise<{ total: number; data: TeamMember[] }> {
  return api.get("/v1/sublicenciados/equipe");
}

export function getTeamMember(api: ApiClient, sublicenciadoId: string): Promise<TeamMemberDetail> {
  return api.get(`/v1/sublicenciados/${encodeURIComponent(sublicenciadoId)}`);
}

/** `null` = this backend has no token invitations (404) → use the code-based link instead. */
export async function listInvitations(api: ApiClient): Promise<TeamInvitation[] | null> {
  try {
    return (await api.get<{ data: TeamInvitation[] }>("/v1/sublicenciados/convites")).data;
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
}

/**
 * Representative signup link used by the live ACVEL web portal:
 * `{LICENCIADO_WEB_URL}/auth/register/sublicenciado?codigo=<codigo_licenciado>`. Without the web URL the
 * app's own deep link is used (opens the app's signup screen when installed).
 */
export function codeInviteLink(codigoLicenciado: string, webUrl = config.licenciadoWebUrl): string {
  const codigo = encodeURIComponent(codigoLicenciado);
  return webUrl
    ? `${webUrl}/auth/register/sublicenciado?codigo=${codigo}`
    : Linking.createURL("/register-sublicenciado", { queryParams: { codigo: codigoLicenciado } });
}

export function createInvitation(
  api: ApiClient,
  input: CreateInvitationInput,
  idempotencyKey: string
): Promise<CreatedTeamInvitation> {
  const email = input.email?.trim().toLowerCase();
  return api.post("/v1/sublicenciados/convites", { email: email || undefined, expires_in_days: input.expires_in_days }, { idempotencyKey });
}

export function revokeInvitation(api: ApiClient, invitationId: string): Promise<TeamInvitation> {
  return api.delete(`/v1/sublicenciados/convites/${encodeURIComponent(invitationId)}`);
}
