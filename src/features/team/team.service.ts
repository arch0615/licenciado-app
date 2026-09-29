import type { ApiClient } from "@/services/api/types";

import type {
  CreatedTeamInvitation,
  CreateInvitationInput,
  TeamInvitation,
  TeamMember,
  TeamMemberDetail
} from "./types";

/**
 * Team (licenciado only). All endpoints are in the licenciado-api Swagger:
 *   GET /v1/sublicenciados/equipe · GET /v1/sublicenciados/{id}
 *   POST/GET /v1/sublicenciados/convites · DELETE /v1/sublicenciados/convites/{id}
 * The tenant is the caller's own licenciado (from the token); no licenciado id is sent.
 */
export function listTeam(api: ApiClient): Promise<{ total: number; data: TeamMember[] }> {
  return api.get("/v1/sublicenciados/equipe");
}

export function getTeamMember(api: ApiClient, sublicenciadoId: string): Promise<TeamMemberDetail> {
  return api.get(`/v1/sublicenciados/${encodeURIComponent(sublicenciadoId)}`);
}

export async function listInvitations(api: ApiClient): Promise<TeamInvitation[]> {
  return (await api.get<{ data: TeamInvitation[] }>("/v1/sublicenciados/convites")).data;
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
