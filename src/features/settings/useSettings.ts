import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getNotificationPreferences,
  getPreferences,
  saveNotificationPreferences,
  savePreferences,
  type NotificationPreferences,
  type Preferences
} from "./settings.service";

export function useNotificationPreferences() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "settings", "notifications"), queryFn: () => getNotificationPreferences(api) });
}

export function useSaveNotificationPreferences() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferences) => saveNotificationPreferences(api, input),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.user(uid, "settings", "notifications"), data)
  });
}

export function usePreferences() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "settings", "preferences"), queryFn: () => getPreferences(api) });
}

export function useSavePreferences() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Preferences) => savePreferences(api, input),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.user(uid, "settings", "preferences"), data)
  });
}
