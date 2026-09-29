import { ApiError } from "@/services/api/errors";

import { resolveRouteState, type RouteStateInput } from "../route-state";
import type { AuthMe } from "../types";

const identity = { uid: "u1", email: "a@b.com" };

const me = (overrides: Partial<AuthMe> = {}): AuthMe => ({
  userId: "user-1",
  uid: "u1",
  email: "a@b.com",
  displayName: "Maria",
  roleSlug: "licenciado_master",
  tipoUsuarioResolvido: "LICENCIADO",
  permissions: [],
  licenciadoId: "lic-1",
  sublicenciadoId: null,
  accountStatus: "APROVADO",
  approvalStatus: "APPROVED",
  ...overrides
});

const ready = (overrides: Partial<RouteStateInput> = {}): RouteStateInput => ({
  identityReady: true,
  identity,
  appStatus: { data: { maintenance: false }, isPending: false, error: null },
  me: { data: me(), isPending: false, error: null },
  ...overrides
});

describe("resolveRouteState", () => {
  it("waits while the identity is being restored", () => {
    expect(resolveRouteState(ready({ identityReady: false })).kind).toBe("bootstrapping");
  });

  it("waits for the first app-status answer (avoids flashing the app before maintenance)", () => {
    expect(resolveRouteState(ready({ appStatus: { data: undefined, isPending: true, error: null } })).kind).toBe(
      "bootstrapping"
    );
  });

  it("routes to maintenance for everyone, signed in or not", () => {
    const maintenance = { data: { maintenance: true, message: "Voltamos logo" }, isPending: false, error: null };
    expect(resolveRouteState(ready({ appStatus: maintenance }))).toEqual({ kind: "maintenance", message: "Voltamos logo" });
    expect(resolveRouteState(ready({ appStatus: maintenance, identity: null })).kind).toBe("maintenance");
  });

  it("never blocks the app when the app-status call fails", () => {
    const failed = { data: undefined, isPending: false, error: new Error("offline") };
    expect(resolveRouteState(ready({ appStatus: failed })).kind).toBe("approved");
  });

  it("routes unauthenticated users to the public stack", () => {
    expect(resolveRouteState(ready({ identity: null })).kind).toBe("signedOut");
  });

  it("waits for /v1/auth/me after sign-in", () => {
    expect(resolveRouteState(ready({ me: { data: undefined, isPending: true, error: null } })).kind).toBe("bootstrapping");
  });

  it("routes approved licenciados and representatives to the app with their role", () => {
    expect(resolveRouteState(ready())).toMatchObject({ kind: "approved", role: "LICENCIADO" });
    const sub = me({ tipoUsuarioResolvido: "SUBLICENCIADO", roleSlug: "sublicenciado_vendedor", sublicenciadoId: "s1" });
    expect(resolveRouteState(ready({ me: { data: sub, isPending: false, error: null } }))).toMatchObject({
      kind: "approved",
      role: "SUBLICENCIADO"
    });
  });

  it("routes not-approved and not-started accounts to the pending area", () => {
    for (const approvalStatus of ["NOT_APPROVED", "NO_RECORD"] as const) {
      const state = resolveRouteState(ready({ me: { data: me({ approvalStatus }), isPending: false, error: null } }));
      expect(state).toMatchObject({ kind: "pending", role: "LICENCIADO" });
    }
  });

  it("routes suspended / inactive / blocked accounts to the blocked screen", () => {
    const cases = [
      ["SUSPENDED", "SUSPENDED"],
      ["INACTIVE", "INACTIVE"],
      ["BLOCKED", "BLOCKED"]
    ] as const;
    for (const [approvalStatus, reason] of cases) {
      const state = resolveRouteState(ready({ me: { data: me({ approvalStatus }), isPending: false, error: null } }));
      expect(state).toEqual({ kind: "blocked", reason });
    }
  });

  it("never lets staff accounts into the licenciado app", () => {
    const staff = me({ tipoUsuarioResolvido: "STAFF", approvalStatus: "STAFF" });
    expect(resolveRouteState(ready({ me: { data: staff, isPending: false, error: null } }))).toEqual({
      kind: "blocked",
      reason: "STAFF"
    });
  });

  it("maps /v1/auth/me errors fail-closed", () => {
    const error = (status: number, code: string) => new ApiError({ status, code, message: "x" });
    const withError = (e: unknown) => ready({ me: { data: undefined, isPending: false, error: e } });

    expect(resolveRouteState(withError(error(401, "INVALID_TOKEN"))).kind).toBe("signedOut");
    expect(resolveRouteState(withError(error(403, "PLATFORM_FORBIDDEN")))).toEqual({
      kind: "blocked",
      reason: "PLATFORM_FORBIDDEN"
    });
    expect(resolveRouteState(withError(error(403, "USER_BLOCKED")))).toEqual({ kind: "blocked", reason: "USER_BLOCKED" });
    expect(resolveRouteState(withError(error(503, "AUTH_UNAVAILABLE"))).kind).toBe("error");
    expect(resolveRouteState(withError(new Error("boom"))).kind).toBe("error");
  });

  it("treats an unknown approval status as an error, never as approved", () => {
    const weird = me({ approvalStatus: "SOMETHING_NEW" as AuthMe["approvalStatus"] });
    expect(resolveRouteState(ready({ me: { data: weird, isPending: false, error: null } })).kind).toBe("error");
  });
});
