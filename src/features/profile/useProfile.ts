import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { newIdempotencyKey } from "@/services/api/client";
import { queryKeys } from "@/services/query/query-keys";
import { useUserId } from "@/services/query/useUserId";
import { api } from "@/services/runtime";

import {
  getContract,
  getProfile,
  listSessions,
  requestAccountDeletion,
  revokeAllSessions,
  revokeSession,
  updateProfile
} from "./profile.service";
import type { LicenciadoProfileUpdate, SublicenciadoProfileUpdate } from "./types";

export function useProfile() {
  const uid = useUserId();
  const { role, me } = useAuthenticatedContext();
  return useQuery({
    queryKey: queryKeys.user(uid, "profile", role),
    queryFn: () => getProfile(api, role),
    // No business record yet (NO_RECORD): nothing to load until onboarding bootstraps it.
    enabled: me.approvalStatus !== "NO_RECORD"
  });
}

export function useUpdateProfile() {
  const uid = useUserId();
  const { role, me } = useAuthenticatedContext();
  const queryClient = useQueryClient();
  const { refresh } = useSession();
  return useMutation({
    mutationFn: (changes: LicenciadoProfileUpdate | SublicenciadoProfileUpdate) => updateProfile(api, me, changes),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.user(uid, "profile", role), profile);
      await refresh();
    }
  });
}


export function useContract(enabled: boolean) {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "profile", "contract"), queryFn: () => getContract(api), enabled });
}

export function useSessions() {
  const uid = useUserId();
  return useQuery({ queryKey: queryKeys.user(uid, "security", "sessions"), queryFn: () => listSessions(api) });
}

export function useRevokeSession() {
  const uid = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(api, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.user(uid, "security", "sessions") })
  });
}

/** Revokes every session on the backend, then signs this device out too. */
export function useRevokeAllSessions() {
  const { signOut } = useSession();
  return useMutation({ mutationFn: () => revokeAllSessions(api), onSuccess: () => signOut() });
}

export function useAccountDeletionRequest() {
  // One key per screen visit: a retry after a network error reuses it (no duplicate requests).
  const key = useRef(newIdempotencyKey("delete-account"));
  return useMutation({ mutationFn: () => requestAccountDeletion(api, key.current) });
}
