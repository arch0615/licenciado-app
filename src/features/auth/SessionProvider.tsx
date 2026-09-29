import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { api, authGateway } from "@/services/runtime";
import { queryKeys } from "@/services/query/query-keys";

import { fetchAppStatus, fetchMe } from "./auth.service";
import { resolveRouteState, type RouteState } from "./route-state";
import type { AuthIdentity } from "./types";

type SessionContextValue = {
  state: RouteState;
  identity: AuthIdentity | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads app status and /v1/auth/me (used by retry buttons and pull-to-refresh). */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Authentication bootstrap:
 *   identity (auth provider) → GET /v1/auth/me (server context) → RouteState
 * The router (src/app/_layout.tsx) exposes exactly one route group per RouteState.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [identityReady, setIdentityReady] = useState(false);
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = authGateway.onIdentityChanged((next) => {
      if (!active) return;
      setIdentity(next);
      if (!next) queryClient.clear(); // never keep another account's data around
    });
    void authGateway
      .initialize()
      .then((initial) => {
        if (!active) return;
        setIdentity(initial);
      })
      .finally(() => {
        if (active) setIdentityReady(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const appStatus = useQuery({
    queryKey: queryKeys.app.status(),
    queryFn: () => fetchAppStatus(api),
    staleTime: 60_000
  });

  const me = useQuery({
    queryKey: queryKeys.auth.me(identity?.uid ?? null),
    queryFn: () => fetchMe(api),
    enabled: identity !== null
  });

  // Mock mode: persona/maintenance toggles take effect immediately.
  // Positive literal check (not an early return) so Metro drops the mock import in production.
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_USE_MOCKS === "true") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps mock code out of production bundles
      const { mockState } = require("@/mock/mock-state") as typeof import("@/mock/mock-state");
      return mockState.subscribe(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.app.status() });
      });
    }
    return undefined;
  }, [queryClient]);

  const state = useMemo(
    () =>
      resolveRouteState({
        identityReady,
        identity,
        appStatus: { data: appStatus.data, isPending: appStatus.isPending, error: appStatus.error },
        me: { data: me.data, isPending: me.isPending, error: me.error }
      }),
    [identityReady, identity, appStatus.data, appStatus.isPending, appStatus.error, me.data, me.isPending, me.error]
  );

  // A 401 from /v1/auth/me means the identity is no longer valid: sign out locally too.
  useEffect(() => {
    if (identity && state.kind === "signedOut") void authGateway.signOut();
  }, [identity, state.kind]);

  const signIn = useCallback((email: string, password: string) => authGateway.signIn(email, password), []);

  const signOut = useCallback(async () => {
    await authGateway.signOut();
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await Promise.all([appStatus.refetch(), identity ? me.refetch() : Promise.resolve()]);
  }, [appStatus, me, identity]);

  const value = useMemo<SessionContextValue>(
    () => ({ state, identity, signIn, signOut, refresh }),
    [state, identity, signIn, signOut, refresh]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = use(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}

/** Narrowed helper for screens that only render when the user is approved or pending. */
export function useAuthenticatedContext() {
  const { state } = useSession();
  if (state.kind !== "approved" && state.kind !== "pending") {
    throw new Error("useAuthenticatedContext used outside an authenticated route group");
  }
  return state;
}
