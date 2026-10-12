import type { ApiClient } from "@/services/api/types";

/**
 * Own settings (portal /notificacoes/configuracoes and /perfil/preferencias). The backend resolves "me" from
 * the token; no id is sent.
 */
export type NotificationPreferences = {
  documentos: boolean;
  ativacaoUc: boolean;
  inadimplencia: boolean;
  compensacao: boolean;
};

export const NOTIFICATION_PREFERENCE_LABELS: Record<keyof NotificationPreferences, { title: string; subtitle: string }> = {
  documentos: { title: "Documentos", subtitle: "Documentos pendentes, aprovados ou reprovados" },
  ativacaoUc: { title: "Ativação de UC", subtitle: "Andamento da ativação das unidades consumidoras" },
  inadimplencia: { title: "Inadimplência", subtitle: "Faturas de clientes em atraso" },
  compensacao: { title: "Compensação", subtitle: "Início e mudanças na compensação de energia" }
};

export const CHANNELS = ["push", "email", "whatsapp", "sms"] as const;
type Channel = (typeof CHANNELS)[number];
type Channels = Record<Channel, boolean>;

export const CHANNEL_LABELS: Record<Channel, string> = {
  push: "Notificações no app",
  email: "E-mail",
  whatsapp: "WhatsApp",
  sms: "SMS"
};

export type Preferences = {
  notifications: Channels;
  language: string;
  privacy: { marketingOptIn: boolean; channelConsent: Channels };
};

type Raw = Record<string, unknown>;
const obj = (value: unknown): Raw => (value && typeof value === "object" ? (value as Raw) : {});
/** Only an explicit `true` from the backend counts — consent is never assumed. */
const yes = (value: unknown) => value === true;

export function mapNotificationPreferences(raw: unknown): NotificationPreferences {
  const body = obj(raw);
  return {
    documentos: yes(body.documentos),
    ativacaoUc: yes(body.ativacaoUc),
    inadimplencia: yes(body.inadimplencia),
    compensacao: yes(body.compensacao)
  };
}

function channels(raw: unknown): Channels {
  const body = obj(raw);
  return { push: yes(body.push), email: yes(body.email), whatsapp: yes(body.whatsapp), sms: yes(body.sms) };
}

/**
 * Unlike the portal (which defaults missing consents to `true`), a missing value is shown as off: LGPD
 * consent must come from an explicit user choice saved on the backend.
 */
export function mapPreferences(raw: unknown): Preferences {
  const body = obj(raw);
  const privacy = obj(body.privacy);
  return {
    notifications: channels(body.notifications),
    language: typeof body.language === "string" && body.language ? body.language : "pt-BR",
    privacy: { marketingOptIn: yes(privacy.marketingOptIn), channelConsent: channels(privacy.channelConsent) }
  };
}

export async function getNotificationPreferences(api: ApiClient): Promise<NotificationPreferences> {
  return mapNotificationPreferences(await api.get<unknown>("/v1/licenciado-settings/me/notification-preferences"));
}

export async function saveNotificationPreferences(api: ApiClient, input: NotificationPreferences): Promise<NotificationPreferences> {
  // Same body as the portal (its type carries a fixed channel placeholder the backend echoes back).
  const body = { ...input, futureChannelPlaceholder: "WHATSAPP_EMAIL" };
  return mapNotificationPreferences(await api.put<unknown>("/v1/licenciado-settings/me/notification-preferences", body));
}

export async function getPreferences(api: ApiClient): Promise<Preferences> {
  return mapPreferences(await api.get<unknown>("/v1/licenciado-settings/me/preferences"));
}

export async function savePreferences(api: ApiClient, input: Preferences): Promise<Preferences> {
  return mapPreferences(await api.put<unknown>("/v1/licenciado-settings/me/preferences", input));
}
