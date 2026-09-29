import { isApiError } from "@/services/api/errors";

import type { AccountRole, AppStatus, AuthIdentity, AuthMe } from "./types";

export type AppRole = Exclude<AccountRole, "STAFF">;

export type BlockedReason =
  | "SUSPENDED"
  | "INACTIVE"
  | "BLOCKED"
  | "PLATFORM_FORBIDDEN"
  | "USER_BLOCKED"
  | "STAFF";

/**
 * Where the app must be. Exactly one route group is reachable for each state
 * (enforced with Stack.Protected in src/app/_layout.tsx).
 */
export type RouteState =
  | { kind: "bootstrapping" }
  | { kind: "error"; error: unknown }
  | { kind: "maintenance"; message: string | null }
  | { kind: "signedOut" }
  | { kind: "blocked"; reason: BlockedReason }
  | { kind: "pending"; role: AppRole; me: AuthMe }
  | { kind: "approved"; role: AppRole; me: AuthMe };

type QueryLike<T> = { data: T | undefined; isPending: boolean; error: unknown };

export type RouteStateInput = {
  identityReady: boolean;
  identity: AuthIdentity | null;
  appStatus: QueryLike<AppStatus>;
  me: QueryLike<AuthMe>;
};

/**
 * Pure routing decision (unit-tested). Order matters:
 * maintenance → identity → server context (/v1/auth/me) → role/approval.
 * Every unknown or failed state lands on a non-privileged screen (fail closed).
 */
export function resolveRouteState(input: RouteStateInput): RouteState {
  const { appStatus, identity, identityReady, me } = input;

  // Maintenance applies to everyone, signed in or not. A failing status call never blocks the app.
  if (appStatus.data?.maintenance) {
    return { kind: "maintenance", message: appStatus.data.message ?? null };
  }
  if (!identityReady || (appStatus.isPending && !appStatus.data && !appStatus.error)) {
    return { kind: "bootstrapping" };
  }
  if (!identity) return { kind: "signedOut" };

  if (me.error) {
    if (isApiError(me.error)) {
      if (me.error.status === 401) return { kind: "signedOut" };
      if (me.error.status === 403) {
        return { kind: "blocked", reason: me.error.code === "USER_BLOCKED" ? "USER_BLOCKED" : "PLATFORM_FORBIDDEN" };
      }
    }
    return { kind: "error", error: me.error };
  }
  if (!me.data) return { kind: "bootstrapping" };

  const context = me.data;
  if (context.tipoUsuarioResolvido === "STAFF") return { kind: "blocked", reason: "STAFF" };
  const role: AppRole = context.tipoUsuarioResolvido;

  switch (context.approvalStatus) {
    case "APPROVED":
      return { kind: "approved", role, me: context };
    case "NOT_APPROVED":
    case "NO_RECORD":
      return { kind: "pending", role, me: context };
    case "SUSPENDED":
      return { kind: "blocked", reason: "SUSPENDED" };
    case "INACTIVE":
      return { kind: "blocked", reason: "INACTIVE" };
    case "BLOCKED":
      return { kind: "blocked", reason: "BLOCKED" };
    case "STAFF":
      return { kind: "blocked", reason: "STAFF" };
    default:
      return { kind: "error", error: new Error(`Unknown approval status: ${String(context.approvalStatus)}`) };
  }
}
