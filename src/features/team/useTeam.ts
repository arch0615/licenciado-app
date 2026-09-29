import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import { createInvitation, getTeamMember, listInvitations, listTeam, revokeInvitation } from "./team.service";
import type { CreateInvitationInput } from "./types";

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

export function useCreateInvitation() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  const key = useRef(newIdempotencyKey("invite"));
  return useMutation({
    mutationFn: (input: CreateInvitationInput) => createInvitation(api, input, key.current),
    onSuccess: async () => {
      key.current = newIdempotencyKey("invite");
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "team", "invitations") });
    }
  });
}

export function useRevokeInvitation() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(api, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "team", "invitations") })
  });
}
