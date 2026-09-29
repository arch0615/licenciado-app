import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hasPermission } from "@/features/auth/permissions";
import { useSession } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./notification.service";

function useCanRead() {
  const { state } = useSession();
  return (state.kind === "approved" || state.kind === "pending") && hasPermission(state.me, "notifications:read");
}

/** Unread count for the bell; refreshed every minute while the app is in the foreground. */
export function useNotificationSummary() {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "notifications", "summary"),
    queryFn: () => getNotificationSummary(api),
    enabled: useCanRead(),
    refetchInterval: 60_000
  });
}

export function useNotifications(onlyUnread: boolean) {
  const uid = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.user(uid, "notifications", "list", onlyUnread),
    queryFn: ({ pageParam }) => listNotifications(api, onlyUnread, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: useCanRead()
  });
}

export function useMarkNotificationRead() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | "all") => (id === "all" ? markAllNotificationsRead(api) : markNotificationRead(api, id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "notifications") })
  });
}
