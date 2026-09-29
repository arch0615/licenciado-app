import { Share } from "react-native";

import { config } from "@/config/env";
import type { AccountProfile } from "@/features/profile/types";

/**
 * Client self-registration link (consumer app): `{CONSUMIDOR_APP_URL}/auth/cadastro?codigo_representante=<code>`
 * where code = codigo_sublicenciado (representative) or codigo_licenciado. The code comes from the
 * backend profile. No QR service is used: the native share sheet sends the link.
 * Invitation status tracking has no backend endpoint yet (see final report).
 */
export function representativeCode(profile: AccountProfile): string | null {
  return profile.role === "SUBLICENCIADO" ? profile.data.codigo_sublicenciado || null : profile.data.codigo_licenciado || null;
}

export function clientInvitationLink(code: string, baseUrl = config.consumidorAppUrl): string | null {
  if (!baseUrl || !code) return null;
  // Built by hand: React Native's URL polyfill does not fully implement searchParams.
  return `${baseUrl.replace(/\/+$/, "")}/auth/cadastro?codigo_representante=${encodeURIComponent(code)}`;
}

export async function shareClientInvitation(link: string): Promise<void> {
  await Share.share({ message: `Economize na sua conta de energia com a ACVEL. Faça seu cadastro: ${link}` });
}
