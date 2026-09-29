import { toPage, type Page } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/** Inventory B17–B20 (business service, not in Swagger). */
export type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  readAt?: string | null;
  entityType?: "CLIENTE" | "UC" | "FATURA" | "SUPORTE" | null;
  entityId?: string | null;
  actionLabel?: string | null;
  /** Relative app path only (validated before navigating). */
  actionHref?: string | null;
};

export type NotificationSummary = { unreadCount: number; latest: NotificationItem[] };

export const NOTIFICATIONS_PAGE_SIZE = 20;

export function getNotificationSummary(api: ApiClient): Promise<NotificationSummary> {
  return api.get<NotificationSummary>("/v1/notifications/me/summary");
}

export async function listNotifications(api: ApiClient, onlyUnread: boolean, page: number): Promise<Page<NotificationItem>> {
  const body = await api.get<unknown>("/v1/notifications/me", {
    query: { page, pageSize: NOTIFICATIONS_PAGE_SIZE, onlyUnread: String(onlyUnread) }
  });
  return toPage<NotificationItem>(body, { page, pageSize: NOTIFICATIONS_PAGE_SIZE });
}

export function markNotificationRead(api: ApiClient, id: string): Promise<unknown> {
  return api.post(`/v1/notifications/me/${encodeURIComponent(id)}/read`);
}

export function markAllNotificationsRead(api: ApiClient): Promise<unknown> {
  return api.post("/v1/notifications/me/read-all");
}
