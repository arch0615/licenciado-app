import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { getDashboard, markDashboardAlertRead, resolveDashboardAlert } from "./dashboard.service";

export function useDashboard() {
  const uid = useUserId();
  const { me, kind } = useAuthenticatedContext();
  const licenciadoId = me.licenciadoId;
  return useQuery({
    queryKey: queryKeys.user(uid, "dashboard"),
    queryFn: () => getDashboard(api, licenciadoId!),
    enabled: kind === "approved" && Boolean(licenciadoId)
  });
}

/** Portal alert actions (mark read / resolve), then refresh the dashboard. */
export function useDashboardAlertAction() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, action }: { alertId: string; action: "read" | "resolve" }) =>
      action === "read"
        ? markDashboardAlertRead(api, me.licenciadoId!, alertId)
        : resolveDashboardAlert(api, me.licenciadoId!, alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "dashboard") })
  });
}
