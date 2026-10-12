import { router, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/forms/TextField";
import { ChipGroup } from "@/components/ui/Chip";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { Screen } from "@/components/ui/Screen";
import { isSafeInAppPath } from "@/features/notifications/push";
import type { NotificationItem } from "@/features/notifications/notification.service";
import { useMarkNotificationRead, useNotifications } from "@/features/notifications/useNotifications";
import { formatDateTime } from "@/lib/format";
import { alertSeverityTone, NOTIFICATION_TYPES } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

const TYPE_FILTERS = [{ value: "ALL", label: "Todos os tipos" }, ...NOTIFICATION_TYPES];
const SEVERITY_FILTERS = [
  { value: "ALL", label: "Todas as severidades" },
  { value: "INFO", label: "Informativo" },
  { value: "WARNING", label: "Atenção" },
  { value: "CRITICAL", label: "Crítico" }
];

/** Structured targets first; `actionHref` only when it is a relative in-app path. */
function targetOf(item: NotificationItem): Href | null {
  if (item.entityType === "CLIENTE" && item.entityId) return { pathname: "/clients/[clientId]", params: { clientId: item.entityId } };
  if (item.entityType === "SUPORTE" && item.entityId) return { pathname: "/support/[ticketId]", params: { ticketId: item.entityId } };
  return isSafeInAppPath(item.actionHref) ? (item.actionHref as Href) : null;
}

/** S39 — Notificações (portal /notificacoes): search, type, severity, unread, mark read / all, open. */
export default function NotificationsScreen() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [type, setType] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search);
  const notifications = useNotifications(filter === "unread", query);
  const markRead = useMarkNotificationRead();
  // The live API filters by text and unread only; type and severity are applied here, like the portal UI.
  const items = (notifications.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (item) => (type === "ALL" || item.type === type) && (severity === "ALL" || item.severity === severity)
  );

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
      <TextField label="Buscar em título e mensagem" value={search} onChangeText={setSearch} autoCorrect={false} />
      <ChipGroup options={TYPE_FILTERS} value={type} onChange={setType} />
      <ChipGroup options={SEVERITY_FILTERS} value={severity} onChange={setSeverity} />
      <Button label="Marcar todas como lidas" variant="ghost" loading={markRead.isPending && markRead.variables === "all"} onPress={() => markRead.mutate("all")} />
      <QueryState
        query={notifications}
        isEmpty={() => items.length === 0}
        empty={
          <AppText tone="muted">
            {type !== "ALL" || severity !== "ALL" || query
              ? "Nenhuma notificação encontrada para os filtros atuais."
              : filter === "unread"
                ? "Nenhuma notificação não lida."
                : "Nenhuma notificação."}
          </AppText>
        }
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
