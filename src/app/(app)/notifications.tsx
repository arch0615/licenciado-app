import { router, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { isSafeInAppPath } from "@/features/notifications/push";
import type { NotificationItem } from "@/features/notifications/notification.service";
import { useMarkNotificationRead, useNotifications } from "@/features/notifications/useNotifications";
import { formatDateTime } from "@/lib/format";
import { alertSeverityTone } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

/** Structured targets first; `actionHref` only when it is a relative in-app path. */
function targetOf(item: NotificationItem): Href | null {
  if (item.entityType === "CLIENTE" && item.entityId) return { pathname: "/clients/[clientId]", params: { clientId: item.entityId } };
  if (item.entityType === "SUPORTE" && item.entityId) return { pathname: "/support/[ticketId]", params: { ticketId: item.entityId } };
  return isSafeInAppPath(item.actionHref) ? (item.actionHref as Href) : null;
}

/** S39 — Notificações (B18–B20). */
export default function NotificationsScreen() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const notifications = useNotifications(filter === "unread");
  const markRead = useMarkNotificationRead();
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];

  function open(item: NotificationItem) {
    if (!item.readAt) markRead.mutate(item.id);
    const target = targetOf(item);
    if (target) router.push(target);
  }

  return (
    <Screen edges={["bottom", "left", "right"]} onRefresh={() => void notifications.refetch()} refreshing={notifications.isRefetching}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ChipGroup
          options={[
            { value: "all", label: "Todas" },
            { value: "unread", label: "Não lidas" }
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      <Button label="Marcar todas como lidas" variant="ghost" loading={markRead.isPending && markRead.variables === "all"} onPress={() => markRead.mutate("all")} />
      <QueryState
        query={notifications}
        isEmpty={() => items.length === 0}
        empty={<AppText tone="muted">{filter === "unread" ? "Nenhuma notificação não lida." : "Nenhuma notificação."}</AppText>}
      >
        {() => (
          <View style={{ gap: spacing.sm }}>
            {items.map((item) => (
              <Card key={item.id} onPress={() => open(item)} variant={item.readAt ? "default" : "alert"} tone={alertSeverityTone(item.severity)}>
                <View style={{ gap: spacing.xxs }}>
                  <AppText variant="bodyStrong">{item.title}</AppText>
                  <AppText variant="callout" tone="muted">
                    {item.message}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatDateTime(item.createdAt)}
                    {item.actionLabel ? ` · ${item.actionLabel}` : ""}
                  </AppText>
                </View>
              </Card>
            ))}
            {notifications.hasNextPage ? (
              <Button label="Carregar mais" variant="ghost" loading={notifications.isFetchingNextPage} onPress={() => void notifications.fetchNextPage()} />
            ) : null}
          </View>
        )}
      </QueryState>
    </Screen>
  );
}
