import { useQuery } from "@tanstack/react-query";

import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { getDashboard } from "./dashboard.service";

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
