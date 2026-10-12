import { normalizeAuthMe } from "@/features/auth/auth.service";
import { hasPermission, normalizePermissions } from "@/features/auth/permissions";
import { ucLinkDistributor, ucLinkLabel, ucLinkNumber } from "@/features/clients/client.service";
import type { ClientUcLink } from "@/features/clients/types";
import { mapMarketplaceContext, mapOrder, mapProduct, toPoints } from "@/features/marketplace/marketplace.service";
import { listInvitations } from "@/features/team/team.service";
import { createApiClient } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import type { ApiRequest } from "@/services/api/types";

/** Permission entries as returned by the live ACVEL `/v1/auth/me` (licenciado_master test account). */
const LIVE_PERMISSIONS = [
  { resource: "comissao", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "consumidor", action: "CREATE", scope: "OWN", level: "OWN" },
  { resource: "consumidor", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "consumidor", action: "UPDATE", scope: "OWN", level: "OWN" },
  { resource: "dashboard", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "documento", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "licenciado", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "licenciado", action: "UPDATE", scope: "OWN", level: "OWN" },
  { resource: "marketplace", action: "READ", scope: "ALL", level: "ALL" },
  { resource: "notificacao", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "onboarding", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "pagamento", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "sublicenciado", action: "CREATE", scope: "OWN", level: "OWN" },
  { resource: "sublicenciado", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "suporte", action: "CREATE", scope: "OWN", level: "OWN" },
  { resource: "suporte", action: "READ", scope: "OWN", level: "OWN" },
  { resource: "consumidor", action: "READ", scope: "OWN", level: "OWN" } // the live list has duplicates
];

const LIVE_ME = {
  userId: "u-1",
  uid: "fb-1",
  email: "licenciado@example.com",
  role: "LICENCIADO_MASTER",
  roleSlug: "licenciado_master",
  roles: [{ slug: "licenciado_master" }, { slug: "consumidor_basico" }, { slug: "gerador" }],
  tipoUsuario: "LICENCIADO",
  tipoUsuarioResolvido: "LICENCIADO",
  status: "ACTIVE",
  permissions: LIVE_PERMISSIONS
};

describe("FIX 1 — permissions (live object shape)", () => {
  it("maps live { resource, action, scope } objects to app permissions", () => {
    const me = normalizeAuthMe(LIVE_ME);
    expect(me.permissions).not.toBeNull();
    for (const permission of [
      "clients:read",
      "clients:write",
      "commissions:read",
      "payments:read",
      "team:read",
      "team:invite",
      "support:use",
      "notifications:read",
      "profile:read",
      "profile:update",
      "onboarding:self",
      "marketplace:use"
    ] as const) {
      expect(hasPermission(me, permission)).toBe(true);
    }
  });

  it("deduplicates repeated live entries", () => {
    const granted = normalizePermissions(LIVE_PERMISSIONS)!;
    expect(granted.filter((p) => p === "clients:read")).toHaveLength(1);
  });

  it("stays strict: a permission the backend did not grant is denied", () => {
    const me = normalizeAuthMe({ ...LIVE_ME, permissions: [{ resource: "consumidor", action: "READ", scope: "OWN" }] });
    expect(hasPermission(me, "clients:read")).toBe(true);
    expect(hasPermission(me, "clients:write")).toBe(false);
    expect(hasPermission(me, "team:read")).toBe(false);
    expect(hasPermission(me, "commissions:read")).toBe(false);
  });

  it("training: not in the raw live mapping, granted by the portal rule to licenciado/representative only", () => {
    expect(normalizePermissions(LIVE_PERMISSIONS)).not.toContain("training:use");
    expect(hasPermission(normalizeAuthMe(LIVE_ME), "training:use")).toBe(true);
    expect(hasPermission(normalizeAuthMe({ ...LIVE_ME, tipoUsuarioResolvido: "SUBLICENCIADO", roleSlug: "sublicenciado_vendedor" }), "training:use")).toBe(true);
    expect(normalizeAuthMe({ ...LIVE_ME, tipoUsuarioResolvido: "STAFF", roleSlug: "admin" }).permissions).not.toContain("training:use");
    // A missing list still falls back to role defaults (unchanged).
    expect(normalizeAuthMe({ ...LIVE_ME, permissions: undefined }).permissions).toBeNull();
  });

  it("ignores unknown resources, unknown actions and malformed entries", () => {
    expect(
      normalizePermissions([
        { resource: "usina", action: "READ", scope: "OWN" },
        { resource: "consumidor", action: "PURGE", scope: "OWN" },
        { resource: 42, action: "READ" },
        { action: "READ" },
        null,
        "not-a-permission"
      ])
    ).toEqual([]);
  });

  it("an empty (present) list grants nothing but the portal Academy rule — no fallback to role defaults", () => {
    const me = normalizeAuthMe({ ...LIVE_ME, permissions: [] });
    expect(me.permissions).toEqual(["training:use"]);
    expect(hasPermission(me, "clients:read")).toBe(false);
  });

  it("still accepts legacy string permissions (licenciado-api)", () => {
    expect(normalizePermissions(["clients:read", "team:read", "unknown:thing"])).toEqual(["clients:read", "team:read"]);
  });

  it("returns null only when the response has no permission list (legacy service → role defaults)", () => {
    expect(normalizePermissions(undefined)).toBeNull();
    expect(normalizeAuthMe({ ...LIVE_ME, permissions: undefined }).permissions).toBeNull();
  });

  it("is case-tolerant on resource and action", () => {
    expect(normalizePermissions([{ resource: "Consumidor", action: "read", scope: "OWN" }])).toEqual(["clients:read"]);
  });
});

function failingApi(error: ApiError) {
  return createApiClient({
    kind: "mock",
    async request<T>(_request: ApiRequest): Promise<T> {
      throw error;
    }
  });
}

describe("FIX 3 — invitations: no-invitations handling", () => {
  it("live unsupported 400 (route captured as /sublicenciados/{id}) → fallback (null)", async () => {
    const api = failingApi(new ApiError({ status: 400, code: "HTTP_400", message: "Validation failed (uuid is expected)" }));
    await expect(listInvitations(api)).resolves.toBeNull();
  });

  it("404 → fallback (null)", async () => {
    const api = failingApi(new ApiError({ status: 404, code: "HTTP_404", message: "Cannot GET /api/v1/sublicenciados/convites" }));
    await expect(listInvitations(api)).resolves.toBeNull();
  });

  it("any 400 on the invitation-list endpoint → no invitations (null)", async () => {
    const api = failingApi(new ApiError({ status: 400, code: "HTTP_400", message: "page must be a positive number" }));
    await expect(listInvitations(api)).resolves.toBeNull();
  });

  it("500 is a real server error and surfaces", async () => {
    const api = failingApi(new ApiError({ status: 500, code: "HTTP_500", message: "Internal error" }));
    await expect(listInvitations(api)).rejects.toMatchObject({ status: 500 });
  });

  it("401/403 and network failures surface too", async () => {
    await expect(listInvitations(failingApi(new ApiError({ status: 403, code: "FORBIDDEN", message: "x" })))).rejects.toMatchObject({ status: 403 });
    await expect(listInvitations(failingApi(new ApiError({ status: 401, code: "HTTP_401", message: "x" })))).rejects.toMatchObject({ status: 401 });
    await expect(listInvitations(failingApi(new ApiError({ status: 0, code: "NETWORK_ERROR", message: "x" })))).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("supported backend → invitation list", async () => {
    const api = createApiClient({
      kind: "mock",
      async request<T>(): Promise<T> {
        return { data: [{ id: "inv-1" }] } as T;
      }
    });
    await expect(listInvitations(api)).resolves.toEqual([{ id: "inv-1" }]);
  });
});

describe("FIX 2 — UC number mapping", () => {
  const UUID = "3f6c2a10-8b1e-4c55-9d2a-7e4b1f0c9a11";
  const journeyUcs = [
    { ucId: "another-uc", ucNumber: "111111111111111" },
    { ucId: UUID, ucNumber: "300012345678901", statusUc: "ATIVA", compensando: true }
  ];

  it("full UC object: uc_numero and distributor", () => {
    const link: ClientUcLink = { id: "v1", uc_id: UUID, uc_numero: "30001234", ativo: true, uc: { concessionaria: "CPFL", cidade: null, uf: null } };
    expect(ucLinkNumber(link, journeyUcs)).toBe("30001234");
    expect(ucLinkLabel(link, journeyUcs)).toBe("UC 30001234");
    expect(ucLinkDistributor(link)).toBe("CPFL");
  });

  it("partial UC object: falls back to numero", () => {
    const link: ClientUcLink = { id: "v1", uc_id: UUID, numero: "30005555", ativo: true };
    expect(ucLinkLabel(link, journeyUcs)).toBe("UC 30005555");
    expect(ucLinkDistributor(link)).toBeNull();
  });

  it("only uc_id (live shape): real number from the journey ucsPreview with the same id", () => {
    const link: ClientUcLink = { id: "v1", uc_id: UUID, ativo: true };
    expect(ucLinkNumber(link, journeyUcs)).toBe("300012345678901");
    expect(ucLinkLabel(link, journeyUcs)).toBe("UC 300012345678901");
  });

  it("only uc_id and no journey match: neutral label, never the internal UUID or 'undefined'", () => {
    const link: ClientUcLink = { id: "v1", uc_id: UUID, ativo: true };
    for (const ucs of [undefined, null, [], [{ ucId: "another-uc", ucNumber: "111" }]]) {
      const label = ucLinkLabel(link, ucs);
      expect(label).toBe("Unidade consumidora");
      expect(label).not.toContain(UUID);
      expect(label).not.toContain("undefined");
    }
  });

  it("blank values are treated as missing", () => {
    expect(ucLinkLabel({ uc_numero: "  ", numero: "", uc_id: "  " }, journeyUcs)).toBe("Unidade consumidora");
    expect(ucLinkLabel({ uc_numero: null, numero: null, uc_id: UUID }, [{ ucId: UUID, ucNumber: " " }])).toBe("Unidade consumidora");
  });
});

describe("FIX 4 — points normalization", () => {
  it.each([
    ["1500", 1500],
    ["1200", 1200],
    ["0", 0],
    [" 75 ", 75],
    ["12.5", 12.5],
    [300, 300]
  ])("%p → %p", (input, expected) => {
    expect(toPoints(input)).toBe(expected);
  });

  it.each([["abc"], [""], ["12abc"], ["1e3"], ["NaN"], [null], [undefined], [Number.NaN], [{}]])(
    "invalid %p → null (never a silent 0)",
    (input) => {
      expect(toPoints(input)).toBeNull();
    }
  );

  it("maps the live context with string points", () => {
    expect(
      mapMarketplaceContext({
        available_points: "1200",
        reserved_points: "0",
        total_points: "1200",
        month_purchases: 0,
        max_purchases_per_month: 20,
        can_purchase: true,
        actor_mode: "CONSUMIDOR"
      })
    ).toEqual({ available_points: 1200, month_purchases: 0, max_purchases_per_month: 20, can_purchase: true });
  });

  it("keeps invalid context values unavailable", () => {
    expect(mapMarketplaceContext({ available_points: "n/a", can_purchase: "yes" })).toEqual({
      available_points: null,
      month_purchases: null,
      max_purchases_per_month: null,
      can_purchase: false
    });
  });

  it("maps product and order points", () => {
    expect(mapProduct({ id: "p1", nome: "Kit", preco_pontos: "500" }).preco_pontos).toBe(500);
    expect(mapOrder({ id: "o1", pontos_gastos: "x" }).pontos_gastos).toBeNull();
  });
});
