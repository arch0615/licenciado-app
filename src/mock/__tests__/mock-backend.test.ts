import { fetchAppStatus, fetchMe } from "@/features/auth/auth.service";
import { resolveRouteState } from "@/features/auth/route-state";
import { createApiClient } from "@/services/api/client";
import { createMockTransport } from "@/services/api/mock-transport";

import { MockAuthGateway } from "../mock-auth-gateway";
import { mockRoutes } from "../handlers";
import { mockState } from "../mock-state";
import { MOCK_PERSONAS } from "../personas";

jest.mock("@/services/storage/secure-storage", () => {
  const memory = new Map<string, string>();
  return {
    secureStorage: {
      get: async (key: string) => memory.get(key) ?? null,
      set: async (key: string, value: string) => void memory.set(key, value),
      remove: async (key: string) => void memory.delete(key)
    }
  };
});

const api = createApiClient(createMockTransport(mockRoutes, { latencyMs: 0 }));

async function routeFor(personaId: (typeof MOCK_PERSONAS)[number]["id"] | null) {
  await mockState.setPersona(personaId);
  const appStatus = await fetchAppStatus(api);
  let me;
  let error: unknown = null;
  try {
    me = await fetchMe(api);
  } catch (caught) {
    error = caught;
  }
  return resolveRouteState({
    identityReady: true,
    identity: personaId ? { uid: personaId, email: null } : null,
    appStatus: { data: appStatus, isPending: false, error: null },
    me: { data: me, isPending: false, error }
  });
}

describe("mock backend + personas cover every routing case", () => {
  afterEach(() => mockState.setMaintenance(false));

  it.each([
    ["licenciado-aprovado", { kind: "approved", role: "LICENCIADO" }],
    ["sublicenciado-aprovado", { kind: "approved", role: "SUBLICENCIADO" }],
    ["licenciado-pendente", { kind: "pending", role: "LICENCIADO" }],
    ["sublicenciado-pendente", { kind: "pending", role: "SUBLICENCIADO" }],
    ["licenciado-sem-cadastro", { kind: "pending", role: "LICENCIADO" }],
    ["conta-suspensa", { kind: "blocked", reason: "SUSPENDED" }],
    ["sem-acesso-plataforma", { kind: "blocked", reason: "PLATFORM_FORBIDDEN" }]
  ] as const)("%s", async (personaId, expected) => {
    expect(await routeFor(personaId)).toMatchObject(expected);
  });

  it("signed out", async () => {
    expect(await routeFor(null)).toEqual({ kind: "signedOut" });
  });

  it("maintenance", async () => {
    mockState.setMaintenance(true);
    expect((await routeFor("licenciado-aprovado")).kind).toBe("maintenance");
  });
});

describe("mock auth gateway", () => {
  it("signs in by persona e-mail, rejects the wrong-password sentinel, and signs out", async () => {
    const gateway = new MockAuthGateway();
    const seen: (string | null)[] = [];
    gateway.onIdentityChanged((identity) => seen.push(identity?.email ?? null));

    await expect(gateway.signIn("representante@acvel.dev", "senha-errada")).rejects.toMatchObject({
      code: "invalid-credentials"
    });
    await gateway.signIn("Representante@ACVEL.dev", "qualquer");
    expect(mockState.currentPersonaId).toBe("sublicenciado-aprovado");
    expect(await gateway.getIdToken()).toBe("mock-token.sublicenciado-aprovado");

    await gateway.signOut();
    expect(await gateway.getIdToken()).toBeNull();
    expect(seen).toEqual(["representante@acvel.dev", null]);
  });
});

describe("mock backend enforces the same permissions as the real one", () => {
  it("licenciado aprovado: clients, commissions, team and payments", async () => {
    await mockState.setPersona("licenciado-aprovado");
    await expect(api.get<{ data: unknown[] }>("/v1/consumidores")).resolves.toMatchObject({ data: expect.any(Array) });
    await expect(api.get("/v1/sublicenciados/equipe")).resolves.toMatchObject({ total: 2 });
    await expect(api.get("/v1/pagamentos-licenciados")).resolves.toMatchObject({ data: expect.any(Array) });
  });

  it("representante: 403 on team and payments; own share only in commissions", async () => {
    await mockState.setPersona("sublicenciado-aprovado");
    await expect(api.get("/v1/sublicenciados/equipe")).rejects.toMatchObject({ status: 403 });
    await expect(api.get("/v1/pagamentos-licenciados")).rejects.toMatchObject({ status: 403 });
    const list = await api.get<{ data: Record<string, unknown>[] }>("/v1/comissoes");
    expect(list.data.length).toBeGreaterThan(0);
    for (const item of list.data) expect(item).not.toHaveProperty("valor_comissao");
  });

  it("pending account: business data is 403 (ACCOUNT_NOT_APPROVED)", async () => {
    await mockState.setPersona("licenciado-pendente");
    await expect(api.get("/v1/consumidores")).rejects.toMatchObject({ status: 403, code: "ACCOUNT_NOT_APPROVED" });
    await expect(api.get("/v1/support/tickets")).resolves.toBeDefined();
  });
});
