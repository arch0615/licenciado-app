import { config } from "@/config/env";
import { isApiError } from "@/services/api/errors";
import type { ApiClient } from "@/services/api/types";

import type { TeamInvitation, TeamMember, TeamMemberDetail } from "./types";

/**
 * Team (licenciado only).
 *   Live ACVEL API: GET /v1/sublicenciados/equipe · GET /v1/sublicenciados/{id}.
 *   Lists existing invitations when the backend has them and invites by sharing the code-based signup link
 *   (the live API has no token-invitation write routes, so the portal invites the same way).
 * The tenant is the caller's own licenciado (from the token); no licenciado id is sent.
 */
export function listTeam(api: ApiClient): Promise<{ total: number; data: TeamMember[] }> {
  return api.get("/v1/sublicenciados/equipe");
}

export function getTeamMember(api: ApiClient, sublicenciadoId: string): Promise<TeamMemberDetail> {
  return api.get(`/v1/sublicenciados/${encodeURIComponent(sublicenciadoId)}`);
}

/**
 * Does this response of `GET /v1/sublicenciados/convites` mean "no invitations available"?
 * - 404: the route does not exist on this backend;
 * - 400: the live ACVEL API answers 400 on this endpoint (it routes `convites` to `/sublicenciados/{id}`).
 * Only the invitation-list call uses this; 5xx, 401/403 and network errors are real errors and surface.
 */
export function isNoInvitationsResponse(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.status === 400);
}

/** `null` = no invitations available on this backend (empty state; inviting uses the code-based link). */
export async function listInvitations(api: ApiClient): Promise<TeamInvitation[] | null> {
  try {
    return (await api.get<{ data: TeamInvitation[] }>("/v1/sublicenciados/convites")).data;
  } catch (error) {
    if (isNoInvitationsResponse(error)) return null;
    throw error;
  }
}

/**
 * Representative signup link of the ACVEL web portal (registration happens there, not in the app):
 * `{LICENCIADO_WEB_URL}/auth/register/sublicenciado?codigo=<codigo_licenciado>`.
 * `null` when the portal URL is not configured.
 */
export function codeInviteLink(codigoLicenciado: string, webUrl = config.licenciadoWebUrl): string | null {
  if (!webUrl || !codigoLicenciado) return null;
  return `${webUrl}/auth/register/sublicenciado?codigo=${encodeURIComponent(codigoLicenciado)}`;
}


