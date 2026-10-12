import { useQuery } from "@tanstack/react-query";

import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { getTeamMember, listInvitations, listTeam } from "./team.service";

/** Team data is requested only with `team:read` (representatives never call these endpoints). */
function useCanReadTeam() {
  const { me } = useAuthenticatedContext();
  return hasPermission(me, "team:read");
}

export function useTeam() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "team", "list"), queryFn: () => listTeam(api), enabled: useCanReadTeam() });
}

export function useTeamMember(id: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: queryKeys.user(uid, "team", "member", id),
    queryFn: () => getTeamMember(api, id),
    enabled: useCanReadTeam()
  });
}

export function useInvitations() {
  const uid = useUserId();
  const { me } = useAuthenticatedContext();
  return useQuery({
    queryKey: queryKeys.user(uid, "team", "invitations"),
    queryFn: () => listInvitations(api),
    enabled: hasPermission(me, "team:invite")
  });
}


