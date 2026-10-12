import { config } from "./env";

/**
 * External portal links. Hosts always come from env (`EXPO_PUBLIC_*`); only the confirmed portal paths live
 * here. A link is `null` (and its entry hidden) when its base URL is not configured.
 *
 * Confirmed portal routes (2026-10-08):
 * - consumer signup:   {CONSUMIDOR_APP_URL}/auth/cadastro?codigo_representante=<codigo>  (client-invitation.ts)
 * - consumer invoices: {CONSUMIDOR_APP_URL}/faturas — the list page; the portal asks for login when there is no
 *   session. Invoice details are never opened directly.
 * - representative signup: {LICENCIADO_WEB_URL}/auth/register/sublicenciado?codigo=<codigo>  (team.service.ts)
 * - terms and privacy: one combined page, /termos-de-uso-e-privacidade (EXPO_PUBLIC_TERMS_URL / _PRIVACY_URL)
 */
export function consumerInvoicesUrl(baseUrl = config.consumidorAppUrl): string | null {
  return baseUrl ? `${baseUrl.replace(/\/+$/, "")}/faturas` : null;
}

export type LegalLink = { label: string; url: string };

/**
 * Terms and privacy links. When both env values point to the same page (the portals use one combined
 * "Termos de uso e privacidade" page), a single entry is returned instead of two links to the same URL.
 */
export function legalLinks(termsUrl = config.termsUrl, privacyUrl = config.privacyUrl): LegalLink[] {
  if (termsUrl && privacyUrl && termsUrl === privacyUrl) return [{ label: "Termos de uso e privacidade", url: termsUrl }];
  return [
    ...(termsUrl ? [{ label: "Termos de uso", url: termsUrl }] : []),
    ...(privacyUrl ? [{ label: "Política de privacidade", url: privacyUrl }] : [])
  ];
}
